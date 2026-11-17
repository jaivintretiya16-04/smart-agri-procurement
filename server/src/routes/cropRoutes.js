import express from 'express';
import { getMasterCrops } from '../controllers/cropController.js';

const router = express.Router();

router.get('/', getMasterCrops);

export default router;
