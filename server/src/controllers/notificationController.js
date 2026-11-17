import * as notifService from '../services/notificationService.js';

export async function getNotifications(req, res, next) {
  try {
    const data = await notifService.getUserNotifications(req.user.id);
    res.json({
      success: true,
      ...data,
    });
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req, res, next) {
  try {
    const { notificationId } = req.params;
    const notif = await notifService.markAsRead(notificationId, req.user.id);
    res.json({
      success: true,
      notification: notif,
    });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req, res, next) {
  try {
    const result = await notifService.markAllAsRead(req.user.id);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

export async function triggerEmailWorker(req, res, next) {
  try {
    const result = await notifService.processEmailJobs();
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}
