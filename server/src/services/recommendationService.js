// Haversine straight-line distance calculation between two GPS coordinates in kilometers
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lat1 === undefined || lon1 === null || lon1 === undefined ||
      lat2 === null || lat2 === undefined || lon2 === null || lon2 === undefined) {
    return null;
  }

  const R = 6371; // Earth's mean radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place (e.g. 5.2 km)
}

/**
 * Balanced Multi-Factor Recommendation Algorithm (FR-04)
 * Weights:
 * - 40% Published Price (higher is better)
 * - 30% Proximity / Distance (lower is better)
 * - 20% Earliest Slot Time (sooner is better)
 * - 10% Estimated Waiting Time (lower is better)
 *
 * Handles missing distance or wait times by renormalizing remaining factor weights.
 */
export function calculateCenterRecommendations(centers, userLocation = null) {
  if (!centers || centers.length === 0) return [];

  // 1. Calculate distances & prepare metric arrays
  const candidates = centers.map((c) => {
    let distance = null;
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      distance = calculateHaversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        c.latitude,
        c.longitude
      );
    }

    const price = c.matchedCrop?.price_per_quintal || 0;
    // Estimated wait time in minutes (default to 20 mins or active queue wait)
    const waitTime = c.estimated_wait_minutes !== undefined ? c.estimated_wait_minutes : 20;

    // Hours until earliest slot
    const hoursUntilSlot = c.earliestSlot
      ? Math.max(0, (new Date(c.earliestSlot.starts_at) - new Date()) / (1000 * 60 * 60))
      : 24; // Default to 24h if no specific slot

    return {
      ...c,
      metrics: {
        price,
        distance,
        hoursUntilSlot,
        waitTime,
      },
    };
  });

  // Extract min/max for normalization
  const validPrices = candidates.map((c) => c.metrics.price).filter((p) => p > 0);
  const validDistances = candidates.map((c) => c.metrics.distance).filter((d) => d !== null);
  const validSlotHours = candidates.map((c) => c.metrics.hoursUntilSlot);
  const validWaits = candidates.map((c) => c.metrics.waitTime).filter((w) => w !== null);

  const minPrice = validPrices.length ? Math.min(...validPrices) : 0;
  const maxPrice = validPrices.length ? Math.max(...validPrices) : 1;

  const minDist = validDistances.length ? Math.min(...validDistances) : 0;
  const maxDist = validDistances.length ? Math.max(...validDistances) : 1;

  const minHours = validSlotHours.length ? Math.min(...validSlotHours) : 0;
  const maxHours = validSlotHours.length ? Math.max(...validSlotHours) : 1;

  const minWait = validWaits.length ? Math.min(...validWaits) : 0;
  const maxWait = validWaits.length ? Math.max(...validWaits) : 1;

  // 2. Score each candidate with dynamic weight renormalization
  const scored = candidates.map((c) => {
    const availableFactors = [];

    // Factor 1: Price (Base weight: 0.40)
    let scorePrice = 1.0;
    if (maxPrice > minPrice) {
      scorePrice = (c.metrics.price - minPrice) / (maxPrice - minPrice);
    }
    availableFactors.push({ name: 'price', weight: 0.40, score: scorePrice });

    // Factor 2: Proximity (Base weight: 0.30)
    if (c.metrics.distance !== null) {
      let scoreDist = 1.0;
      if (maxDist > minDist) {
        scoreDist = 1.0 - (c.metrics.distance - minDist) / (maxDist - minDist);
      }
      availableFactors.push({ name: 'distance', weight: 0.30, score: scoreDist });
    }

    // Factor 3: Earliest Slot (Base weight: 0.20)
    let scoreSlot = 1.0;
    if (maxHours > minHours) {
      scoreSlot = 1.0 - (c.metrics.hoursUntilSlot - minHours) / (maxHours - minHours);
    }
    availableFactors.push({ name: 'earliestSlot', weight: 0.20, score: scoreSlot });

    // Factor 4: Wait Time (Base weight: 0.10)
    if (c.metrics.waitTime !== null) {
      let scoreWait = 1.0;
      if (maxWait > minWait) {
        scoreWait = 1.0 - (c.metrics.waitTime - minWait) / (maxWait - minWait);
      }
      availableFactors.push({ name: 'waitTime', weight: 0.10, score: scoreWait });
    }

    // Renormalize weights so they sum strictly to 1.0
    const totalAvailableWeight = availableFactors.reduce((sum, f) => sum + f.weight, 0);

    let finalScore = 0;
    const factorBreakdown = {};

    for (const factor of availableFactors) {
      const normalizedWeight = factor.weight / totalAvailableWeight;
      const contribution = normalizedWeight * factor.score * 100;
      finalScore += contribution;
      factorBreakdown[factor.name] = {
        baseWeight: factor.weight,
        normalizedWeight: Math.round(normalizedWeight * 100) / 100,
        score: Math.round(factor.score * 100) / 100,
        contribution: Math.round(contribution * 10) / 10,
      };
    }

    finalScore = Math.round(finalScore * 10) / 10;

    // Generate human-readable recommendation explanation badges
    const badges = [];
    if (c.metrics.price === maxPrice && maxPrice > minPrice) {
      badges.push('Best Published Price');
    }
    if (c.metrics.distance !== null && c.metrics.distance === minDist && minDist < maxDist) {
      badges.push('Closest Center');
    }
    if (c.metrics.hoursUntilSlot === minHours && minHours < maxHours) {
      badges.push('Earliest Available Appointment');
    }
    if (c.type === 'government') {
      badges.push('Official State Mandi');
    }

    return {
      ...c,
      recommendationScore: finalScore,
      distanceKm: c.metrics.distance,
      factorBreakdown,
      badges,
    };
  });

  // Sort by recommendationScore descending
  scored.sort((a, b) => b.recommendationScore - a.recommendationScore);

  return scored;
}
