import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import * as paymentController from '../controllers/paymentController.js';

const router = express.Router();

router.use(authMiddleware);

// Operator/Admin: Update payment status & append event (Phase 6, AT-15)
router.patch(
  '/:paymentId/status',
  requireRole('operator', 'admin'),
  paymentController.updateStatus
);

// Authenticated: Get payment details with audit trail
router.get(
  '/:paymentId',
  paymentController.getPaymentDetails
);

// Farmer: Get all payments
router.get(
  '/my/list',
  requireRole('farmer', 'admin'),
  paymentController.getMyPayments
);

// Operator/Admin: Center payments
router.get(
  '/center/:centerId',
  requireRole('operator', 'admin'),
  paymentController.getCenterPayments
);

export default router;
