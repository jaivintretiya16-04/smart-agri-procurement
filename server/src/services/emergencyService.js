import { query, withTransaction } from '../config/db.js';
import { createNotification, queueEmailJob } from './notificationService.js';

/**
 * Emergency Center Management & Operational Pauses (Phase 7, AT-12)
 */

export async function pauseCenter({ centerId, operatorId, operatorRole, reason }) {
  if (operatorRole !== 'admin') {
    const authRes = await query(
      `SELECT id FROM center_operator_assignments WHERE center_id = $1 AND operator_id = $2`,
      [centerId, operatorId]
    );
    if (authRes.rows.length === 0) {
      const err = new Error('Unauthorized: You are not assigned to this procurement center.');
      err.statusCode = 403;
      err.code = 'UNAUTHORIZED_CENTER_OPERATOR';
      throw err;
    }
  }

  const res = await query(
    `UPDATE centers
     SET active_state = 'paused', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [centerId]
  );

  if (res.rows.length === 0) {
    const err = new Error('Center not found');
    err.statusCode = 404;
    throw err;
  }

  // Audit log
  await query(
    `INSERT INTO audit_logs (actor_id, entity_name, entity_id, action, after_state)
     VALUES ($1, 'centers', $2, 'pause_center', $3)`,
    [operatorId, centerId, JSON.stringify({ reason: reason || 'Temporary Operational Pause' })]
  );

  return res.rows[0];
}

export async function resumeCenter({ centerId, operatorId, operatorRole }) {
  if (operatorRole !== 'admin') {
    const authRes = await query(
      `SELECT id FROM center_operator_assignments WHERE center_id = $1 AND operator_id = $2`,
      [centerId, operatorId]
    );
    if (authRes.rows.length === 0) {
      const err = new Error('Unauthorized: You are not assigned to this procurement center.');
      err.statusCode = 403;
      err.code = 'UNAUTHORIZED_CENTER_OPERATOR';
      throw err;
    }
  }

  const res = await query(
    `UPDATE centers
     SET active_state = 'active', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [centerId]
  );

  if (res.rows.length === 0) {
    const err = new Error('Center not found');
    err.statusCode = 404;
    throw err;
  }

  // Audit log
  await query(
    `INSERT INTO audit_logs (actor_id, entity_name, entity_id, action, after_state)
     VALUES ($1, 'centers', $2, 'resume_center', $3)`,
    [operatorId, centerId, JSON.stringify({ state: 'active' })]
  );

  return res.rows[0];
}

/**
 * Emergency Closure: Safely transitions bookings to rescheduling_required,
 * preventing false no-show penalties (AT-12).
 */
export async function emergencyCloseCenter({
  centerId,
  operatorId,
  operatorRole,
  reason,
  targetDate = null,
}) {
  if (!reason || !reason.trim()) {
    const err = new Error('A valid reason must be stated for an emergency center closure.');
    err.statusCode = 400;
    err.code = 'CLOSURE_REASON_REQUIRED';
    throw err;
  }

  if (operatorRole !== 'admin') {
    const authRes = await query(
      `SELECT id FROM center_operator_assignments WHERE center_id = $1 AND operator_id = $2`,
      [centerId, operatorId]
    );
    if (authRes.rows.length === 0) {
      const err = new Error('Unauthorized: You are not assigned to this procurement center.');
      err.statusCode = 403;
      err.code = 'UNAUTHORIZED_CENTER_OPERATOR';
      throw err;
    }
  }

  return await withTransaction(async (client) => {
    // 1. Update center state to closed
    const centerRes = await client.query(
      `UPDATE centers
       SET active_state = 'closed', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [centerId]
    );

    if (centerRes.rows.length === 0) {
      const err = new Error('Center not found');
      err.statusCode = 404;
      throw err;
    }
    const center = centerRes.rows[0];

    // 2. Identify affected bookings
    let queryStr = `
      SELECT b.id, b.farmer_id, b.slot_id, b.estimated_quintals, b.booking_reference,
             u.email as farmer_email, fp.name as farmer_name
      FROM bookings b
      JOIN slots s ON b.slot_id = s.id
      JOIN users u ON b.farmer_id = u.id
      LEFT JOIN farmer_profiles fp ON b.farmer_id = fp.user_id
      WHERE b.center_id = $1
        AND b.status IN ('confirmed', 'checked_in')
    `;
    const params = [centerId];

    if (targetDate) {
      queryStr += ` AND s.starts_at >= $2::timestamptz AND s.starts_at < ($2::timestamptz + INTERVAL '24 hours')`;
      params.push(targetDate);
    }

    const affectedRes = await client.query(queryStr, params);
    const affectedBookings = affectedRes.rows;

    const affectedIds = [];

    // 3. Update bookings to 'rescheduling_required' and release capacity safely
    for (const b of affectedBookings) {
      affectedIds.push(b.id);

      // Transition booking
      await client.query(
        `UPDATE bookings
         SET status = 'rescheduling_required',
             cancellation_reason = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [`Emergency Closure: ${reason.trim()}`, b.id]
      );

      // Release reserved slot capacity
      await client.query(
        `UPDATE slots
         SET reserved_farmers = GREATEST(0, reserved_farmers - 1),
             reserved_quintals = GREATEST(0.00, reserved_quintals - $1)
         WHERE id = $2`,
        [b.estimated_quintals, b.slot_id]
      );

      // 4. Send In-App Notification (Bilingual)
      await createNotification({
        userId: b.farmer_id,
        eventType: 'emergency_closure',
        titleEn: 'Center Emergency Closure — Rescheduling Required',
        titleHi: 'केंद्र आपातकालीन बंदी — अपॉइंटमेंट पुनर्निर्धारण आवश्यक',
        messageEn: `Procurement at ${center.name} has been paused due to emergency (${reason.trim()}). Your appointment has been protected without penalty. Please select an alternate slot.`,
        messageHi: `${center.name} पर आपातकालीन स्थिति (${reason.trim()}) के कारण खरीद स्थगित कर दी गई है। आपकी बुकिंग बिना किसी जुर्माने के सुरक्षित है। कृपया नया स्लॉट चुनें।`,
        linkUrl: '/farmer/bookings',
      });

      // 5. Queue Email Job
      await queueEmailJob({
        userId: b.farmer_id,
        recipientEmail: b.farmer_email,
        templateKey: 'emergency_closure_reschedule',
        payload: {
          farmerName: b.farmer_name || 'Farmer',
          centerName: center.name,
          bookingReference: b.booking_reference,
          reason: reason.trim(),
        },
      });
    }

    // 6. Record Audit Log
    await client.query(
      `INSERT INTO audit_logs (actor_id, entity_name, entity_id, action, after_state)
       VALUES ($1, 'centers', $2, 'emergency_close', $3)`,
      [
        operatorId,
        centerId,
        JSON.stringify({
          reason: reason.trim(),
          affectedBookingsCount: affectedBookings.length,
        }),
      ]
    );

    return {
      center,
      affectedCount: affectedBookings.length,
      affectedBookingIds: affectedIds,
    };
  });
}
