const { punchQueue } = require('../services/punchQueue');
const FacultyDeviceMapping = require('../models/FacultyDeviceMapping');
const DeviceRegistration = require('../models/fingerprint');
const logger = require('../../../core/logging/logger');

const FacultyAttendance = require('../../attendance').FacultyAttendance;

punchQueue.process('process-punch', async (job) => {
  const { schoolId, deviceId, deviceUserId, punchTime, rawPayload } = job.data;

  const mapping = await FacultyDeviceMapping.findOne({
    schoolId,
    deviceId,
    deviceUserId: String(deviceUserId),
    isActive: true,
  });

  if (!mapping) {
    // A data problem, not a transient one — skip rather than burn the retries
    logger.warn(
      `[AttendanceWorker] No faculty mapping for deviceUserId=${deviceUserId} schoolId=${schoolId}`
    );
    return { skipped: true, reason: 'no_mapping' };
  }

  const punch = new Date(punchTime);
  const dateOnly = new Date(
    punch.getFullYear(),
    punch.getMonth(),
    punch.getDate()
  );

  const existing = await FacultyAttendance.findOne({
    schoolId,
    facultyId: mapping.facultyId,
    date: dateOnly,
  });

  const rawPunchEntry = {
    time: punch,
    deviceUserId: String(deviceUserId),
    deviceId,
    queueJobId: String(job.id),
  };

  if (!existing) {
    await FacultyAttendance.create({
      schoolId,
      facultyId: mapping.facultyId,
      date: dateOnly,
      punchIn: punch,
      source: 'device',
      rawPunches: [rawPunchEntry],
    });
  } else {
    existing.rawPunches.push(rawPunchEntry);

    // Widened, not overwritten: punches can arrive out of order
    if (!existing.punchOut || punch > existing.punchOut) {
      existing.punchOut = punch;
    }

    if (existing.punchIn && punch < existing.punchIn) {
      existing.punchIn = punch;
    }

    await existing.save(); // pre-save hook recalculates totalHours + status
  }

  await DeviceRegistration.findByIdAndUpdate(deviceId, {
    lastPingAt: new Date(),
    $inc: { totalPunches: 1 },
  });

  return {
    processed: true,
    facultyId: mapping.facultyId,
    date: dateOnly,
  };
});

// ── Error handling ─────────────────────────────────────────────────────────
punchQueue.on('failed', (job, err) => {
  logger.error(
    `[AttendanceWorker] Job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}):`,
    err.message
  );
});

punchQueue.on('completed', (job, result) => {
  if (result?.processed) {
    logger.info(
      `[AttendanceWorker] Job ${job.id} ✓ faculty=${result.facultyId} date=${result.date?.toISOString()?.slice(0, 10)}`
    );
  }
});

// Swallowed on purpose: the queue is stubbed when Redis is down, so errors here
// are expected and non-fatal
punchQueue.on('error', () => {});

logger.info('✅ Attendance Worker started — listening for punch jobs');

module.exports = punchQueue;
