import { query } from '../config/db.js';

export async function getMasterCrops(req, res, next) {
  try {
    const result = await query(
      'SELECT id, code, name_en, name_hi, unit, created_at FROM crops ORDER BY code ASC'
    );
    res.json({
      success: true,
      crops: result.rows,
    });
  } catch (err) {
    next(err);
  }
}
