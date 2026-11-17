import { getCenterSlots } from '../services/slotService.js';

export async function getSlotsForCenter(req, res, next) {
  try {
    const { centerId } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    const targetDate = date || new Date().toISOString().slice(0, 10);

    const slots = await getCenterSlots(centerId, targetDate);

    res.json({
      success: true,
      centerId,
      date: targetDate,
      count: slots.length,
      slots,
    });
  } catch (err) {
    next(err);
  }
}
