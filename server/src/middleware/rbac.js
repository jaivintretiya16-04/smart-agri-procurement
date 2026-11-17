import { query } from '../config/db.js';

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: true,
        code: 'FORBIDDEN',
        message: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}

export async function verifyCenterOperatorAccess(req, res, next) {
  try {
    const centerId = req.params.centerId || req.body.centerId;
    if (!centerId) {
      return res.status(400).json({
        error: true,
        code: 'MISSING_CENTER_ID',
        message: 'Center ID is required',
      });
    }

    // Admins have overarching access
    if (req.user.role === 'admin') {
      return next();
    }

    if (req.user.role !== 'operator') {
      return res.status(403).json({
        error: true,
        code: 'FORBIDDEN',
        message: 'Only center operators or administrators can perform this action',
      });
    }

    const check = await query(
      'SELECT id FROM center_operator_assignments WHERE operator_id = $1 AND center_id = $2',
      [req.user.id, centerId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({
        error: true,
        code: 'CENTER_ACCESS_DENIED',
        message: 'You are not assigned to manage this procurement center',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}
