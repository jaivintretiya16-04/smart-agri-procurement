import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { query } from '../config/db.js';

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: true,
        code: 'UNAUTHORIZED',
        message: 'Authentication token missing or invalid',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, ENV.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: true,
          code: 'TOKEN_EXPIRED',
          message: 'Your session has expired. Please log in again.',
        });
      }
      return res.status(401).json({
        error: true,
        code: 'INVALID_TOKEN',
        message: 'Invalid session token',
      });
    }

    // Verify user exists and token version matches in DB
    const userResult = await query(
      'SELECT id, email, role, token_version, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: true,
        code: 'USER_NOT_FOUND',
        message: 'User no longer exists',
      });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        error: true,
        code: 'USER_DISABLED',
        message: 'Account has been deactivated. Please contact support.',
      });
    }

    if (decoded.tokenVersion !== user.token_version) {
      return res.status(401).json({
        error: true,
        code: 'TOKEN_REVOKED',
        message: 'Session has been invalidated. Please log in again.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
