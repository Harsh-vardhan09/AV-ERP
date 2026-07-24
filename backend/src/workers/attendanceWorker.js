const { punchQueue } = require('../services/punchQueue');
const FacultyDeviceMapping = require('../models/FacultyDeviceMapping');
const FacultyAttendance = require('../models/FacultyAttendance');
const DeviceRegistration = require('../models/fingerprint');

/**
 * Attendance Worker
 * Processes punch jobs from the Bull queue.
 *
 * For each punch job:
 * 1. Resolve facultyId from deviceUserId + schoolId
 * 2. Upsert FacultyAttendance record for that day
 * 3. Update punchIn (first punch) / punchOut (subsequent punches)
 * 4. Update device lastPingAt + totalPunches
 */
punchQueue.process('process-punch', async (job) => {
  const { schoolId, deviceId, deviceUserId, punchTime, rawPayload } = job.data;

  // ── 1. Find faculty mapping ───────────────────────────────────────────────
  const mapping = await FacultyDeviceMapping.findOne({
    schoolId,
    deviceId,           // ← precise: match specific device, not just school
    deviceUserId: String(deviceUserId),
    isActive: true,
  });

  if (!mapping) {
    // Device user not mapped — log and skip (don't retry, this is a data issue)
    console.warn(
      `[AttendanceWorker] No faculty mapping for deviceUserId=${deviceUserId} schoolId=${schoolId}`
    );
    return { skipped: true, reason: 'no_mapping' };
  }

  // ── 2. Normalize date to start of day (IST → UTC adjusted) ───────────────
  const punch = new Date(punchTime);
  const dateOnly = new Date(
    punch.getFullYear(),
    punch.getMonth(),
    punch.getDate()
  );

  // ── 3. Upsert FacultyAttendance for this faculty + date ──────────────────
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
    // First punch of the day → punchIn
    await FacultyAttendance.create({
      schoolId,
      facultyId: mapping.facultyId,
      date: dateOnly,
      punchIn: punch,
      source: 'device',
      rawPunches: [rawPunchEntry],
    });
  } else {
    // Subsequent punch → always update punchOut to latest time
    existing.rawPunches.push(rawPunchEntry);

    // punchOut = latest punch (most recent time)
    if (!existing.punchOut || punch > existing.punchOut) {
      existing.punchOut = punch;
    }

    // punchIn = earliest punch (in case of out-of-order delivery)
    if (existing.punchIn && punch < existing.punchIn) {
      existing.punchIn = punch;
    }

    await existing.save(); // pre-save hook recalculates totalHours + status
  }

  // ── 4. Update device stats ────────────────────────────────────────────────
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
  console.error(
    `[AttendanceWorker] Job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}):`,
    err.message
  );
});

punchQueue.on('completed', (job, result) => {
  if (result?.processed) {
    console.log(
      `[AttendanceWorker] Job ${job.id} ✓ faculty=${result.facultyId} date=${result.date?.toISOString()?.slice(0, 10)}`
    );
  }
});

punchQueue.on('error', (err) => {
  // Redis unavailable - graceful degradation. Silently ignore.
  // Queue is stubbed when Redis is down, so this doesn't affect functionality.
});

console.log('✅ Attendance Worker started — listening for punch jobs');

module.exports = punchQueue;
