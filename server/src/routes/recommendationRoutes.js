import express from 'express';
import { getRecommendations } from '../controllers/recommendationController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Optional auth: works for public visitors, or automatically uses farmer's profile coordinates if authenticated
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authMiddleware(req, res, next);
  }
  next();
};

router.post('/', optionalAuth, getRecommendations);

export default router;
