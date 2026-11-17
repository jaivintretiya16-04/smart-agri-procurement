import { query } from '../config/db.js';
import { calculateCenterRecommendations } from '../services/recommendationService.js';

export async function getRecommendations(req, res, next) {
  try {
    const { cropCode, quantityQuintals, latitude, longitude, district, sortBy } = req.body;

    if (!cropCode) {
      return res.status(400).json({
        error: true,
        code: 'MISSING_CROP',
        message: 'A crop selection is required (e.g. wheat, rice, maize, mustard, gram)',
      });
    }

    const quantity = parseFloat(quantityQuintals);
    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({
        error: true,
        code: 'INVALID_QUANTITY',
        message: 'Estimated crop quantity must be a positive number in quintals',
      });
    }

    // 1. Look up crop record
    const cropRes = await query('SELECT id, code, name_en, name_hi, unit FROM crops WHERE code = $1', [cropCode]);
    if (cropRes.rows.length === 0) {
      return res.status(404).json({
        error: true,
        code: 'CROP_NOT_FOUND',
        message: `Crop with code '${cropCode}' was not found in catalog`,
      });
    }
    const crop = cropRes.rows[0];

    // 2. Determine farmer search origin
    let userLocation = null;
    if (latitude !== undefined && longitude !== undefined && latitude !== null && longitude !== null) {
      userLocation = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };
    } else if (req.user && req.user.role === 'farmer') {
      // Fetch saved coordinates from farmer profile
      const profRes = await query(
        'SELECT latitude, longitude, district FROM farmer_profiles WHERE user_id = $1',
        [req.user.id]
      );
      if (profRes.rows.length > 0 && profRes.rows[0].latitude && profRes.rows[0].longitude) {
        userLocation = {
          latitude: parseFloat(profRes.rows[0].latitude),
          longitude: parseFloat(profRes.rows[0].longitude),
        };
      }
    }

    // 3. Query all approved & active centers accepting this crop with active prices
    const centersSql = `
      SELECT c.*,
             cc.min_quality_grade, cc.special_requirements,
             ccp.rate_per_quintal, ccp.effective_from
      FROM centers c
      JOIN center_crops cc ON c.id = cc.center_id AND cc.is_accepted = TRUE
      JOIN crops cr ON cc.crop_id = cr.id
      LEFT JOIN center_crop_prices ccp 
        ON ccp.center_id = c.id 
       AND ccp.crop_id = cr.id 
       AND (ccp.effective_to IS NULL OR ccp.effective_to > NOW())
      WHERE c.verification_status = 'approved'
        AND c.active_state = 'active'
        AND cr.code = $1
      ORDER BY c.name ASC
    `;

    const centersRes = await query(centersSql, [cropCode]);
    const centers = centersRes.rows;

    if (centers.length === 0) {
      return res.json({
        success: true,
        crop,
        requestedQuantity: quantity,
        userLocation,
        count: 0,
        recommendations: [],
      });
    }

    // 4. Enrich centers with earliest available bookable slots and earnings
    const enrichedCenters = [];
    for (const c of centers) {
      const price = c.rate_per_quintal ? parseFloat(c.rate_per_quintal) : 0;
      const estimatedEarnings = Math.round(quantity * price * 100) / 100;

      // Find earliest future slot with available dual capacity
      const slotRes = await query(
        `SELECT id, starts_at, ends_at, max_farmers, max_quintals, reserved_farmers, reserved_quintals
         FROM slots
         WHERE center_id = $1
           AND starts_at > NOW()
           AND is_blocked = FALSE
           AND (reserved_farmers + 1 <= max_farmers)
           AND (reserved_quintals + $2 <= max_quintals)
         ORDER BY starts_at ASC
         LIMIT 1`,
        [c.id, quantity]
      );

      const earliestSlot = slotRes.rows.length > 0 ? slotRes.rows[0] : null;

      enrichedCenters.push({
        id: c.id,
        name: c.name,
        type: c.type,
        address: c.address,
        district: c.district,
        state: c.state,
        pincode: c.pincode,
        latitude: parseFloat(c.latitude),
        longitude: parseFloat(c.longitude),
        contact_phone: c.contact_phone,
        matchedCrop: {
          crop_id: crop.id,
          code: crop.code,
          name_en: crop.name_en,
          name_hi: crop.name_hi,
          price_per_quintal: price,
          effective_from: c.effective_from,
        },
        estimatedEarnings,
        earliestSlot: earliestSlot ? {
          id: earliestSlot.id,
          starts_at: earliestSlot.starts_at,
          ends_at: earliestSlot.ends_at,
          availableFarmerCapacity: earliestSlot.max_farmers - earliestSlot.reserved_farmers,
          availableQuintalCapacity: Math.round((earliestSlot.max_quintals - earliestSlot.reserved_quintals) * 100) / 100,
        } : null,
        hasAvailableSlot: !!earliestSlot,
      });
    }

    // 5. Run balanced multi-factor scoring algorithm
    let recommendations = calculateCenterRecommendations(enrichedCenters, userLocation);

    // 6. Handle optional user sorting override
    if (sortBy === 'price') {
      recommendations.sort((a, b) => (b.matchedCrop?.price_per_quintal || 0) - (a.matchedCrop?.price_per_quintal || 0));
    } else if (sortBy === 'distance') {
      recommendations.sort((a, b) => {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    } else if (sortBy === 'slot') {
      recommendations.sort((a, b) => {
        if (!a.earliestSlot) return 1;
        if (!b.earliestSlot) return -1;
        return new Date(a.earliestSlot.starts_at) - new Date(b.earliestSlot.starts_at);
      });
    }

    res.json({
      success: true,
      crop,
      requestedQuantity: quantity,
      userLocation,
      count: recommendations.length,
      recommendations,
    });
  } catch (err) {
    next(err);
  }
}
