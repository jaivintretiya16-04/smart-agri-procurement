import express from 'express';
import {
  bookSlot,
  cancelFarmerBooking,
  getMyBookings,
} from '../controllers/bookingController.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', requireRole('farmer'), bookSlot);
router.get('/my', requireRole('farmer'), getMyBookings);
router.post('/:bookingId/cancel', requireRole('farmer'), cancelFarmerBooking);

export default router;
