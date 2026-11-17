import * as paymentService from '../services/paymentService.js';

export async function updateStatus(req, res, next) {
  try {
    const { paymentId } = req.params;
    const { status, referenceId, notes } = req.body;

    const result = await paymentService.updatePaymentStatus({
      paymentId,
      newStatus: status,
      referenceId,
      notes,
      actorId: req.user.id,
      actorRole: req.user.role,
    });

    res.json({
      success: true,
      message: `Payment status updated to ${status}`,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getPaymentDetails(req, res, next) {
  try {
    const { paymentId } = req.params;
    const details = await paymentService.getPaymentDetails(paymentId);

    if (!details) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    res.json({
      success: true,
      payment: details,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyPayments(req, res, next) {
  try {
    const payments = await paymentService.getFarmerPayments(req.user.id);
    res.json({
      success: true,
      payments,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCenterPayments(req, res, next) {
  try {
    const { centerId } = req.params;
    const payments = await paymentService.getCenterPayments(centerId);
    res.json({
      success: true,
      payments,
    });
  } catch (err) {
    next(err);
  }
}
