import express from 'express';
import {
  operatorCheckIn,
  getLiveQueue,
  callNext,
  setQueueStatus,
  runNoShowSweep,
  acceptHold,
} from '../controllers/queueController.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole, verifyCenterOperatorAccess } from '../middleware/rbac.js';

const router = express.Router();

// Public / Farmer live queue view
router.get('/center/:centerId', getLiveQueue);

// Operator actions
router.post('/check-in', authMiddleware, verifyCenterOperatorAccess, operatorCheckIn);
router.post('/center/:centerId/call-next', authMiddleware, verifyCenterOperatorAccess, callNext);
router.patch('/:queueEntryId/status', authMiddleware, requireRole('operator', 'admin'), setQueueStatus);

// Sweep no-shows (Cron or Admin)
router.post('/sweep-no-shows', authMiddleware, requireRole('admin', 'operator'), runNoShowSweep);

// Waitlist hold acceptance
router.post('/holds/accept', authMiddleware, requireRole('farmer'), acceptHold);

export default router;
