import { query, withTransaction } from '../config/db.js';

/**
 * Isolated Demo Simulation & Virtual Time Controller (Phase 8, AT-20)
 * Operates with strict isolation from normal system workflows.
 */

const DEFAULT_SCENARIO = 'college_eval_demo';

export async function initDemoScenario(scenarioName = DEFAULT_SCENARIO) {
  const existing = await query(
    `SELECT * FROM demo_scenarios WHERE scenario_name = $1`,
    [scenarioName]
  );

  if (existing.rows.length > 0) {
    const updated = await query(
      `UPDATE demo_scenarios
       SET virtual_time = NOW(), is_active = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE scenario_name = $1
       RETURNING *`,
      [scenarioName]
    );
    return updated.rows[0];
  }

  const created = await query(
    `INSERT INTO demo_scenarios (scenario_name, virtual_time, is_active, metadata)
     VALUES ($1, NOW(), TRUE, $2)
     RETURNING *`,
    [
      scenarioName,
      JSON.stringify({
        description: 'College final year project evaluation scenario',
        autoAdvances: false,
      }),
    ]
  );

  return created.rows[0];
}

export async function advanceVirtualTime({ scenarioName = DEFAULT_SCENARIO, minutes = 15 }) {
  // Ensure scenario exists
  await initDemoScenario(scenarioName);

  // In pg-mem and real PostgreSQL, interval manipulation
  const res = await query(
    `UPDATE demo_scenarios
     SET virtual_time = virtual_time + ($1 || ' minutes')::interval,
         updated_at = CURRENT_TIMESTAMP
     WHERE scenario_name = $2
     RETURNING *`,
    [String(minutes), scenarioName]
  );

  return res.rows[0];
}

export async function getDemoState(scenarioName = DEFAULT_SCENARIO) {
  const scRes = await query(
    `SELECT * FROM demo_scenarios WHERE scenario_name = $1`,
    [scenarioName]
  );

  let scenario = scRes.rows[0];
  if (!scenario) {
    scenario = await initDemoScenario(scenarioName);
  }

  // Fetch quick metrics for the evaluation desk
  const metrics = await query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'farmer') as farmer_count,
      (SELECT COUNT(*) FROM centers WHERE verification_status = 'approved') as center_count,
      (SELECT COUNT(*) FROM bookings) as total_bookings,
      (SELECT COUNT(*) FROM queue_entries WHERE queue_status = 'waiting') as waiting_in_queue,
      (SELECT COUNT(*) FROM procurement_records) as completed_intakes,
      (SELECT COALESCE(SUM(payable_amount), 0) FROM procurement_records) as total_disbursed
  `);

  return {
    scenario,
    virtualTime: scenario.virtual_time,
    isActive: scenario.is_active,
    simulationMetrics: {
      farmerCount: parseInt(metrics.rows[0]?.farmer_count || '0', 10),
      centerCount: parseInt(metrics.rows[0]?.center_count || '0', 10),
      totalBookings: parseInt(metrics.rows[0]?.total_bookings || '0', 10),
      waitingInQueue: parseInt(metrics.rows[0]?.waiting_in_queue || '0', 10),
      completedIntakes: parseInt(metrics.rows[0]?.completed_intakes || '0', 10),
      totalDisbursed: parseFloat(metrics.rows[0]?.total_disbursed || '0'),
    },
  };
}

export async function resetDemoScenario(scenarioName = DEFAULT_SCENARIO) {
  const res = await query(
    `UPDATE demo_scenarios
     SET virtual_time = NOW(), is_active = FALSE, updated_at = CURRENT_TIMESTAMP
     WHERE scenario_name = $1
     RETURNING *`,
    [scenarioName]
  );

  return {
    success: true,
    message: 'Demo scenario reset to real time and standby state.',
    scenario: res.rows[0] || null,
  };
}
