import {
  checkInFarmer,
  getCenterQueue,
  callNextInQueue,
  updateQueueStatus,
  sweepNoShows,
  acceptWaitlistHold,
} from '../services/queueService.js';

export async function operatorCheckIn(req, res, next) {
  try {
    const { qrToken, centerId } = req.body;
    const operatorId = req.user.id;

    const result = await checkInFarmer({
      qrToken,
      centerId,
      operatorId,
    });

    // Broadcast Socket.IO update if io instance available
    const io = req.app.get('io');
    if (io) {
      io.to(`center_${centerId}`).emit('queue_updated', {
        centerId,
        action: 'check_in',
        tokenNumber: result.tokenNumber,
        queuePosition: result.queuePosition,
      });
    }

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getLiveQueue(req, res, next) {
  try {
    const { centerId } = req.params;
    const queue = await getCenterQueue(centerId);

    res.json({
      success: true,
      centerId,
      count: queue.length,
      queue,
    });
  } catch (err) {
    next(err);
  }
}

export async function callNext(req, res, next) {
  try {
    const { centerId } = req.params;
    const operatorId = req.user.id;

    const calledEntry = await callNextInQueue(centerId, operatorId);

    if (!calledEntry) {
      return res.json({
        success: true,
        message: 'No waiting farmers in queue to call',
        calledEntry: null,
      });
    }

    // Broadcast Socket.IO event
    const io = req.app.get('io');
    if (io) {
      io.to(`center_${centerId}`).emit('token_called', {
        centerId,
        tokenNumber: calledEntry.token_number,
        bookingId: calledEntry.booking_id,
        farmerName: calledEntry.farmer_name,
      });
    }

    res.json({
      success: true,
      message: `Token #${calledEntry.token_number} called for service`,
      calledEntry,
    });
  } catch (err) {
    next(err);
  }
}

export async function setQueueStatus(req, res, next) {
  try {
    const { queueEntryId } = req.params;
    const { status, centerId } = req.body; // 'serving', 'completed', 'skipped'
    const operatorId = req.user.id;

    const updated = await updateQueueStatus(queueEntryId, status, operatorId);

    const io = req.app.get('io');
    if (io && centerId) {
      io.to(`center_${centerId}`).emit('queue_updated', {
        centerId,
        action: 'status_change',
        queueEntryId,
        newStatus: status,
      });
    }

    res.json({
      success: true,
      message: `Queue status updated to '${status}'`,
      queueEntry: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function runNoShowSweep(req, res, next) {
  try {
    const result = await sweepNoShows();
    res.json({
      success: true,
      message: `No-show cutoff sweep completed. ${result.sweptCount} booking(s) reconciled.`,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

export async function acceptHold(req, res, next) {
  try {
    const { holdToken } = req.body;
    const farmerId = req.user.id;

    const hold = await acceptWaitlistHold(holdToken, farmerId);

    res.json({
      success: true,
      message: 'Waitlist hold accepted successfully',
      hold,
    });
  } catch (err) {
    next(err);
  }
}
