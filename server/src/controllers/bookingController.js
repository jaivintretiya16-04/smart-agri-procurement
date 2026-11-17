import {
  createBooking,
  cancelBooking,
  listFarmerBookings,
} from '../services/bookingService.js';

export async function bookSlot(req, res, next) {
  try {
    const { centerId, slotId, cropId, estimatedQuintals, idempotencyKey } = req.body;
    const farmerId = req.user.id;

    if (!slotId || !cropId || !estimatedQuintals) {
      return res.status(400).json({
        error: true,
        code: 'VALIDATION_ERROR',
        message: 'slotId, cropId, and estimatedQuintals are required',
      });
    }

    const headerIdempotency = req.headers['x-idempotency-key'] || idempotencyKey;

    const result = await createBooking({
      farmerId,
      centerId,
      slotId,
      cropId,
      estimatedQuintals,
      idempotencyKey: headerIdempotency,
    });

    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully',
      booking: result.booking,
      qrToken: result.qrToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelFarmerBooking(req, res, next) {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;
    const farmerId = req.user.id;

    const cancelledBooking = await cancelBooking(bookingId, farmerId, reason);

    res.json({
      success: true,
      message: 'Booking cancelled successfully. Capacity released.',
      booking: cancelledBooking,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyBookings(req, res, next) {
  try {
    const farmerId = req.user.id;
    const bookings = await listFarmerBookings(farmerId);

    res.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (err) {
    next(err);
  }
}
