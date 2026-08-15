/**
 * A student's own attendance — a month calendar plus the session percentage.
 *
 * Reads /api/v1/attendance/me, which derives identity from the token. No
 * studentId is sent, so there is no parameter that could name another student.
 */
import React, { useState, useMemo } from 'react';
import { useGetMyAttendanceQuery } from '../api/attendanceApi';

const STATUS_STYLE = {
  present: { cls: 'bg-green-100 text-green-800 border-green-300', label: 'Present' },
  absent: { cls: 'bg-red-100 text-red-800 border-red-300', label: 'Absent' },
  late: { cls: 'bg-amber-100 text-amber-800 border-amber-300', label: 'Late' },
  leave: { cls: 'bg-indigo-100 text-indigo-800 border-indigo-300', label: 'Leave' },
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const Stat = ({ label, value, tone = 'text-gray-800' }) => (
  <div className="bg-white rounded-xl border p-4 text-center">
    <div className={`text-2xl font-bold ${tone}`}>{value}</div>
    <div className="text-xs text-gray-500 mt-1">{label}</div>
  </div>
);

const MyAttendance = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading, error } = useGetMyAttendanceQuery({ year, month });
  const summary = data?.data?.summary;
  const days = data?.data?.month?.days || [];

  const byDate = useMemo(
    () => Object.fromEntries(days.map((d) => [d.date, d])),
    [days]
  );

  // Calendar grid: leading blanks so the 1st lands under its weekday.
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(year, month - 1, 1));
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const lead = first.getUTCDay(); // 0 = Sunday
    const out = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      out.push({ day: d, key, mark: byDate[key] });
    }
    return out;
  }, [year, month, byDate]);

  const step = (delta) => {
    const m = month + delta;
    if (m < 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else if (m > 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth(m);
    }
  };

  if (isLoading) return <div className="text-center py-12 text-gray-500">Loading…</div>;

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-10 rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        {error?.data?.message || 'Could not load your attendance.'}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">My Attendance</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Stat
          label="Attendance"
          value={`${summary?.percentage ?? 0}%`}
          tone={
            (summary?.percentage ?? 0) >= 75
              ? 'text-green-700'
              : (summary?.percentage ?? 0) >= 60
                ? 'text-amber-600'
                : 'text-red-600'
          }
        />
        <Stat label="Present" value={summary?.presentDays ?? 0} />
        <Stat label="Absent" value={summary?.absentDays ?? 0} />
        <Stat label="Days marked" value={summary?.totalDays ?? 0} />
      </div>

      {summary?.leaveDays > 0 && (
        <p className="text-xs text-gray-500 mb-4">
          {summary.leaveDays} day(s) of approved leave are excluded from the percentage.
          Late arrivals count as present.
        </p>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <button
            onClick={() => step(-1)}
            className="px-3 py-1 text-sm rounded-md border border-gray-300 hover:bg-gray-100"
            aria-label="Previous month"
          >
            ←
          </button>
          <span className="font-medium text-gray-800">
            {MONTHS[month - 1]} {year}
          </span>
          <button
            onClick={() => step(1)}
            className="px-3 py-1 text-sm rounded-md border border-gray-300 hover:bg-gray-100"
            aria-label="Next month"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 p-3">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">
              {d}
            </div>
          ))}
          {cells.map((c, i) =>
            c === null ? (
              <div key={`blank-${i}`} />
            ) : (
              <div
                key={c.key}
                title={c.mark ? STATUS_STYLE[c.mark.status]?.label : 'Not marked'}
                className={`aspect-square rounded-md border text-sm flex flex-col items-center justify-center ${
                  c.mark
                    ? STATUS_STYLE[c.mark.status]?.cls || 'bg-gray-50 border-gray-200'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}
              >
                <span className="font-medium">{c.day}</span>
                {c.mark && (
                  <span className="text-[10px] uppercase tracking-wide">
                    {c.mark.status === 'leave' ? 'Lv' : c.mark.status[0]}
                  </span>
                )}
              </div>
            )
          )}
        </div>

        <div className="px-4 py-3 border-t bg-gray-50 flex gap-4 flex-wrap text-xs">
          {Object.entries(STATUS_STYLE).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`inline-block w-3 h-3 rounded border ${v.cls}`} />
              {v.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="inline-block w-3 h-3 rounded border bg-gray-50 border-gray-200" />
            Not marked
          </span>
        </div>
      </div>
    </div>
  );
};

export default MyAttendance;
