import * as demoService from '../services/demoService.js';

export async function initScenario(req, res, next) {
  try {
    const { scenarioName } = req.body;
    const scenario = await demoService.initDemoScenario(scenarioName);
    res.json({
      success: true,
      message: 'Demo scenario initialized with virtual time clock',
      scenario,
    });
  } catch (err) {
    next(err);
  }
}

export async function advanceTime(req, res, next) {
  try {
    const { scenarioName, minutes } = req.body;
    const scenario = await demoService.advanceVirtualTime({
      scenarioName,
      minutes: parseInt(minutes || '15', 10),
    });
    res.json({
      success: true,
      message: `Virtual time advanced by ${minutes || 15} minutes`,
      scenario,
      virtualTime: scenario.virtual_time,
    });
  } catch (err) {
    next(err);
  }
}

export async function getState(req, res, next) {
  try {
    const { scenarioName } = req.query;
    const state = await demoService.getDemoState(scenarioName);
    res.json({
      success: true,
      ...state,
    });
  } catch (err) {
    next(err);
  }
}

export async function resetScenario(req, res, next) {
  try {
    const { scenarioName } = req.body;
    const result = await demoService.resetDemoScenario(scenarioName);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}
