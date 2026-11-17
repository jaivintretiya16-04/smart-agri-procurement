import express from 'express';
import {
  listCenters,
  getCenterById,
  createCenter,
  reviewCenterVerification,
  updateCenterPrices,
  updateCenterSchedule,
  pauseCenterHandler,
  resumeCenterHandler,
  emergencyCloseCenterHandler,
  getCenterAnalyticsHandler,
  getAdminAnalyticsHandler,
} from '../controllers/centerController.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole, verifyCenterOperatorAccess } from '../middleware/rbac.js';

const router = express.Router();

// Optional auth reader for public listing (hydrates req.user if token present)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authMiddleware(req, res, next);
  }
  next();
};

// Admin system analytics (must precede /:centerId)
router.get('/admin/overview', authMiddleware, requireRole('admin'), getAdminAnalyticsHandler);

router.get('/', optionalAuth, listCenters);
router.get('/:centerId', optionalAuth, getCenterById);

// Create center: Operator or Admin
router.post('/', authMiddleware, requireRole('operator', 'admin'), createCenter);

// Admin Center Verification
router.post('/:centerId/verify', authMiddleware, requireRole('admin'), reviewCenterVerification);

// Assigned Operator or Admin Center Updates
router.put('/:centerId/prices', authMiddleware, verifyCenterOperatorAccess, updateCenterPrices);
router.put('/:centerId/schedule', authMiddleware, verifyCenterOperatorAccess, updateCenterSchedule);

// Emergency & Operations Controls (AT-12)
router.post('/:centerId/pause', authMiddleware, verifyCenterOperatorAccess, pauseCenterHandler);
router.post('/:centerId/resume', authMiddleware, verifyCenterOperatorAccess, resumeCenterHandler);
router.post('/:centerId/emergency-close', authMiddleware, verifyCenterOperatorAccess, emergencyCloseCenterHandler);

// Analytics
router.get('/:centerId/analytics', authMiddleware, verifyCenterOperatorAccess, getCenterAnalyticsHandler);

export default router;
