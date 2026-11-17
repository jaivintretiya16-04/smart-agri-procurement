import express from 'express';
import * as demoController from '../controllers/demoController.js';

const router = express.Router();

// Evaluator Demo Simulation Endpoints (AT-20)
// Open for project demo evaluation desk without auth barrier
router.get('/state', demoController.getState);
router.post('/scenario/init', demoController.initScenario);
router.post('/time/advance', demoController.advanceTime);
router.post('/reset', demoController.resetScenario);

export default router;
