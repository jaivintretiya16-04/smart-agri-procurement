import * as procurementService from '../services/procurementService.js';

export async function processIntake(req, res, next) {
  try {
    const {
      bookingId,
      grossWeight,
      tareWeight,
      qualityGrade,
      acceptedQuantity,
      deductionAmount,
      outcome,
      rejectionReason,
      notes,
    } = req.body;

    const result = await procurementService.recordProcurementIntake({
      bookingId,
      operatorId: req.user.id,
      operatorRole: req.user.role,
      grossWeight,
      tareWeight,
      qualityGrade,
      acceptedQuantity,
      deductionAmount,
      outcome,
      rejectionReason,
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Procurement intake recorded and digital receipt generated successfully.',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getReceipt(req, res, next) {
  try {
    const { identifier } = req.params;
    const receipt = await procurementService.getReceiptByIdOrNumber(identifier);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found',
      });
    }

    res.json({
      success: true,
      receipt,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyReceipts(req, res, next) {
  try {
    const receipts = await procurementService.getFarmerReceipts(req.user.id);
    res.json({
      success: true,
      receipts,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCenterProcurements(req, res, next) {
  try {
    const { centerId } = req.params;
    const records = await procurementService.getCenterProcurements(centerId);
    res.json({
      success: true,
      records,
    });
  } catch (err) {
    next(err);
  }
}
