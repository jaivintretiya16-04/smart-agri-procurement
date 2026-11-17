import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import * as procurementController from '../controllers/procurementController.js';

const router = express.Router();

router.use(authMiddleware);

// Operator/Admin: Record crop intake & generate receipt (Phase 6, AT-14)
router.post(
  '/intake',
  requireRole('operator', 'admin'),
  procurementController.processIntake
);

// Farmer: View my receipts
router.get(
  '/receipts/my',
  requireRole('farmer', 'admin'),
  procurementController.getMyReceipts
);

// Public/Authenticated: View receipt by ID or number
router.get(
  '/receipts/:identifier',
  procurementController.getReceipt
);

// Operator/Admin: List center procurements
router.get(
  '/center/:centerId',
  requireRole('operator', 'admin'),
  procurementController.getCenterProcurements
);

export default router;
