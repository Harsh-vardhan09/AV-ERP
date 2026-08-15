/**
 * Daily attendance marking — one record per student per day, by the class teacher.
 *
 * Replaces per-period marking. The server decides who may mark (the section's
 * ClassTeacherAssignment, plus admin); this screen mirrors that so it does not
 * offer a write that will be rejected, but the server stays authoritative.
 */
import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useGetMyClassTeacherQuery } from '@modules/people/api/teacherApi';
import { useGetActiveSessionQuery } from '@shared/lib/api/adminApi';
import { useGetSectionDayQuery, useMarkAttendanceMutation } from '../api/attendanceApi';

const STATUSES = [
  { key: 'present', label: 'Present', short: 'P', cls: 'bg-green-600 border-green-600 text-white' },
  { key: 'absent', label: 'Absent', short: 'A', cls: 'bg-red-600 border-red-600 text-white' },
  { key: 'late', label: 'Late', short: 'L', cls: 'bg-amber-500 border-amber-500 text-white' },
  { key: 'leave', label: 'Leave', short: 'Lv', cls: 'bg-indigo-600 border-indigo-600 text-white' },
];

// The school day, as the browser sees it. The server re-derives the day in the
// school's timezone, so this is only a default for the picker.
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const MarkDailyAttendance = () => {
  const { data: sessionData } = useGetActiveSessionQuery();
  const sessionId = sessionData?.data?._id;

  const { data: ctData, isLoading: ctLoading } = useGetMyClassTeacherQuery();
  const assignment = ctData?.data;
  const classId = assignment?.classId?._id || assignment?.classId;
  const sectionId = assignment?.sectionId?._id || assignment?.sectionId;

  const [date, setDate] = useState(todayKey());
  const [marks, setMarks] = useState({});
  const [dirty, setDirty] = useState(false);

  const { data, isFetching, error, refetch } = useGetSectionDayQuery(
    { classId, sectionId, session: sessionId, date },
    { skip: !classId || !sectionId }
  );
  const day = data?.data;

  const [markAttendance, { isLoading: saving }] = useMarkAttendanceMutation();

  // Reset local edits whenever the server day changes — otherwise yesterday's
  // unsaved marks would bleed onto today's roster.
  useEffect(() => {
    if (!day) return;
    setMarks(Object.fromEntries(day.roster.map((r) => [r.studentId, r.status])));
    setDirty(false);
  }, [day]);

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, leave: 0, unmarked: 0 };
    for (const r of day?.roster || []) {
      const s = marks[r.studentId];
      if (s && c[s] !== undefined) c[s]++;
      else c.unmarked++;
    }
    return c;
  }, [day, marks]);

  const setOne = (studentId, status) => {
    setMarks((m) => ({ ...m, [studentId]: status }));
    setDirty(true);
  };

  const setAll = (status) => {
    setMarks(Object.fromEntries((day?.roster || []).map((r) => [r.studentId, status])));
    setDirty(true);
  };

  const handleSave = async () => {
    const entries = (day?.roster || [])
      .filter((r) => marks[r.studentId])
      .map((r) => ({ studentId: r.studentId, status: marks[r.studentId] }));

    if (!entries.length) return toast.error('Mark at least one student first.');
    if (entries.length < (day?.roster || []).length) {
      const missing = (day?.roster || []).length - entries.length;
      if (!window.confirm(`${missing} student(s) are still unmarked. Save anyway?`)) return;
    }

    try {
      const res = await markAttendance({
        classId, sectionId, session: sessionId, date, entries,
      }).unwrap();
      toast.success(res.message || 'Attendance saved');
      setDirty(false);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save attendance');
    }
  };

  if (ctLoading) return <div className="text-center py-12 text-gray-500">Loading…</div>;

  // Only a class teacher marks. Say who does, rather than showing an empty screen.
  if (!assignment) {
    return (
      <div className="max-w-xl mx-auto mt-10 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <p className="font-semibold mb-1">You are not a class teacher</p>
        <p>
          Daily attendance is marked once per day by the class teacher of each section.
          Subject teachers no longer mark attendance per period. If this looks wrong, ask
          the office to check your class-teacher assignment.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border p-5 mb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Daily Attendance</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Class {assignment.classId?.name} — Section {assignment.sectionId?.name}
            </p>
          </div>
          <div>
            <label htmlFor="att-date" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              id="att-date"
              type="date"
              value={date}
              max={todayKey()}
              onChange={(e) => setDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
            />
          </div>
        </div>

        {day?.isMarked && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            ✓ Already marked{day.markedBy ? ` by ${day.markedBy.name}` : ''}
            {day.markedAt ? ` on ${new Date(day.markedAt).toLocaleString('en-IN')}` : ''}.
            You can correct it below and save again.
          </div>
        )}
        {day && !day.isMarked && day.markedCount > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Partly marked — {day.markedCount} of {day.totalStudents} students.
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {error?.data?.message || 'Failed to load the roster.'}
        </div>
      )}

      {isFetching && <p className="text-center py-8 text-gray-400">Loading roster…</p>}

      {!isFetching && day && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2 flex-wrap">
              <span className="text-sm text-gray-600 mr-1">Mark all:</span>
              {STATUSES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setAll(s.key)}
                  className="text-xs px-3 py-1 rounded-full border border-gray-300 hover:bg-gray-100"
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-600 flex gap-3 flex-wrap">
              <span>Present {counts.present}</span>
              <span>Absent {counts.absent}</span>
              <span>Late {counts.late}</span>
              <span>Leave {counts.leave}</span>
              {counts.unmarked > 0 && (
                <span className="text-amber-700 font-medium">Unmarked {counts.unmarked}</span>
              )}
            </div>
          </div>

          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Roll</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Student</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {day.roster.map((r) => (
                <tr key={r.studentId} className={marks[r.studentId] ? '' : 'bg-amber-50/40'}>
                  <td className="px-4 py-2 text-sm text-gray-500">{r.rollNo}</td>
                  <td className="px-4 py-2 text-sm font-medium text-gray-800">{r.name}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1.5 flex-wrap" role="group" aria-label={`Status for ${r.name}`}>
                      {STATUSES.map((s) => {
                        const active = marks[r.studentId] === s.key;
                        return (
                          <button
                            key={s.key}
                            onClick={() => setOne(r.studentId, s.key)}
                            aria-pressed={active}
                            title={s.label}
                            className={`w-9 h-8 rounded-md border text-xs font-semibold transition-colors ${
                              active ? s.cls : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {s.short}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
              {day.roster.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-gray-500">
                    No active students in this section.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="px-5 py-4 bg-gray-50 border-t flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs text-gray-500">
              {dirty ? 'Unsaved changes' : 'No unsaved changes'}
            </span>
            <button
              onClick={handleSave}
              disabled={saving || day.roster.length === 0}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : day.isMarked ? 'Update Attendance' : 'Save Attendance'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkDailyAttendance;
