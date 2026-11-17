import { query } from '../config/db.js';

/**
 * Ensures 30-minute slots exist for a given center and date (YYYY-MM-DD) based on center_schedules.
 */
export async function ensureSlotsForDate(centerId, dateStr) {
  const targetDate = new Date(`${dateStr}T00:00:00Z`);
  const dayOfWeek = targetDate.getUTCDay(); // 0 is Sunday, 1 is Monday...

  // 1. Check if slots already exist for this center on this date
  const existing = await query(
    `SELECT COUNT(*) AS count 
     FROM slots 
     WHERE center_id = $1 
       AND starts_at >= $2::timestamptz 
       AND starts_at < ($2::timestamptz + INTERVAL '1 day')`,
    [centerId, `${dateStr}T00:00:00Z`]
  );

  if (parseInt(existing.rows[0].count, 10) > 0) {
    return;
  }

  // 2. Fetch center schedule for this day of week
  const scheduleRes = await query(
    `SELECT * FROM center_schedules 
     WHERE center_id = $1 AND day_of_week = $2 AND is_active = TRUE`,
    [centerId, dayOfWeek]
  );

  if (scheduleRes.rows.length === 0) {
    // Center closed on this day (e.g. Sunday)
    return;
  }

  const sched = scheduleRes.rows[0];
  const slotDurationMinutes = sched.slot_duration_minutes || 30;
  const maxFarmers = sched.default_max_farmers || 10;
  const maxQuintals = sched.default_max_quintals || 100.00;

  const [openHour, openMin] = sched.open_time.split(':').map(Number);
  const [closeHour, closeMin] = sched.close_time.split(':').map(Number);

  const startMinutes = openHour * 60 + openMin;
  const endMinutes = closeHour * 60 + closeMin;

  for (let m = startMinutes; m + slotDurationMinutes <= endMinutes; m += slotDurationMinutes) {
    const sH = String(Math.floor(m / 60)).padStart(2, '0');
    const sM = String(m % 60).padStart(2, '0');
    const eH = String(Math.floor((m + slotDurationMinutes) / 60)).padStart(2, '0');
    const eM = String((m + slotDurationMinutes) % 60).padStart(2, '0');

    const startsAt = `${dateStr}T${sH}:${sM}:00Z`;
    const endsAt = `${dateStr}T${eH}:${eM}:00Z`;

    await query(
      `INSERT INTO slots (
         center_id, starts_at, ends_at, max_farmers, max_quintals,
         reserved_farmers, reserved_quintals, is_blocked
       )
       VALUES ($1, $2, $3, $4, $5, 0, 0.00, FALSE)`,
      [centerId, startsAt, endsAt, maxFarmers, maxQuintals]
    );
  }
}

export async function getCenterSlots(centerId, dateStr) {
  await ensureSlotsForDate(centerId, dateStr);

  const slotsRes = await query(
    `SELECT id, center_id, starts_at, ends_at, max_farmers, max_quintals,
            reserved_farmers, reserved_quintals, is_blocked,
            (max_farmers - reserved_farmers) AS available_farmers,
            (max_quintals - reserved_quintals) AS available_quintals
     FROM slots
     WHERE center_id = $1
       AND starts_at >= $2::timestamptz
       AND starts_at < ($2::timestamptz + INTERVAL '1 day')
     ORDER BY starts_at ASC`,
    [centerId, `${dateStr}T00:00:00Z`]
  );

  return slotsRes.rows.map((s) => ({
    ...s,
    available_farmers: Math.max(0, parseInt(s.available_farmers, 10)),
    available_quintals: Math.max(0, Math.round(parseFloat(s.available_quintals) * 100) / 100),
    is_bookable: !s.is_blocked && s.available_farmers > 0 && s.available_quintals > 0 && new Date(s.starts_at) > new Date(),
  }));
}
