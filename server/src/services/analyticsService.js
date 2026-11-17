import { query } from '../config/db.js';

/**
 * Analytics & Mandi Operations Intelligence Service (Phase 7)
 */

export async function getCenterAnalytics(centerId) {
  // 1. Booking Status Counts
  const statusRes = await query(
    `SELECT status, COUNT(*) as count
     FROM bookings
     WHERE center_id = $1
     GROUP BY status`,
    [centerId]
  );

  const statusCounts = {
    confirmed: 0,
    checked_in: 0,
    in_service: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
    rescheduling_required: 0,
  };
  let totalBookings = 0;

  statusRes.rows.forEach((r) => {
    statusCounts[r.status] = parseInt(r.count, 10);
    totalBookings += parseInt(r.count, 10);
  });

  // No-show rate
  const scheduledCount = statusCounts.completed + statusCounts.no_show + statusCounts.checked_in;
  const noShowRate = scheduledCount > 0
    ? Number(((statusCounts.no_show / scheduledCount) * 100).toFixed(1))
    : 0;

  // 2. Volume Procured by Crop
  const volumeRes = await query(
    `SELECT c.name_en, c.name_hi,
            COALESCE(SUM(pr.accepted_quantity), 0) as total_quintals,
            COALESCE(SUM(pr.payable_amount), 0) as total_payable
     FROM crops c
     LEFT JOIN bookings b ON b.crop_id = c.id AND b.center_id = $1
     LEFT JOIN procurement_records pr ON pr.booking_id = b.id
     GROUP BY c.id, c.name_en, c.name_hi
     ORDER BY total_quintals DESC`,
    [centerId]
  );

  // 3. Payment Status Breakdown
  const payRes = await query(
    `SELECT p.payment_status,
            COUNT(*) as count,
            COALESCE(SUM(p.amount), 0) as total_amount
     FROM payments p
     JOIN procurement_records pr ON p.procurement_record_id = pr.id
     WHERE pr.center_id = $1
     GROUP BY p.payment_status`,
    [centerId]
  );

  // 4. Center Operating State
  const centerRes = await query(`SELECT name, type, district, active_state FROM centers WHERE id = $1`, [centerId]);

  return {
    center: centerRes.rows[0],
    totalBookings,
    statusCounts,
    noShowRate,
    cropProcurements: volumeRes.rows.map((r) => ({
      cropNameEn: r.name_en,
      cropNameHi: r.name_hi,
      totalQuintals: parseFloat(r.total_quintals) || 0,
      totalPayable: parseFloat(r.total_payable) || 0,
    })),
    payments: payRes.rows.map((r) => ({
      status: r.payment_status,
      count: parseInt(r.count, 10),
      totalAmount: parseFloat(r.total_amount) || 0,
    })),
  };
}

export async function getAdminAnalytics() {
  // System totals
  const centersCount = await query(`SELECT COUNT(*) as cnt, type FROM centers GROUP BY type`);
  const farmersCount = await query(`SELECT COUNT(*) as cnt FROM users WHERE role = 'farmer'`);
  const totalVolume = await query(
    `SELECT COALESCE(SUM(accepted_quantity), 0) as quintals,
            COALESCE(SUM(payable_amount), 0) as amount
     FROM procurement_records`
  );

  const bookingsByStatus = await query(
    `SELECT status, COUNT(*) as count FROM bookings GROUP BY status`
  );

  return {
    centers: centersCount.rows,
    totalFarmers: parseInt(farmersCount.rows[0]?.cnt || '0', 10),
    totalProcuredQuintals: parseFloat(totalVolume.rows[0]?.quintals) || 0,
    totalDisbursedPayable: parseFloat(totalVolume.rows[0]?.amount) || 0,
    bookingsDistribution: bookingsByStatus.rows,
  };
}
