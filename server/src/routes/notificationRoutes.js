import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as notifController from '../controllers/notificationController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', notifController.getNotifications);
router.patch('/:notificationId/read', notifController.markAsRead);
router.patch('/read-all', notifController.markAllRead);
router.post('/process-email-jobs', notifController.triggerEmailWorker);

export default router;
