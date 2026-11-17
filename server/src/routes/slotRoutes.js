import express from 'express';
import { getSlotsForCenter } from '../controllers/slotController.js';

const router = express.Router();

router.get('/center/:centerId', getSlotsForCenter);

export default router;
