import React, { useState } from 'react';
import { useGetMyAttendanceQuery } from '../../redux/api/studentApi';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const statusConfig = {
  present: { label: 'Present', cls: 'bg-green-100 text-green-700 border-green-300' },
  absent: { label: 'Absent', cls: 'bg-red-100 text-red-700 border-red-300' },
  late: { label: 'Late', cls: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  leave: { label: 'Leave', cls: 'bg-blue-100 text-blue-700 border-blue-300' },
};

const StudentAttendance = () => {
  const [filterSubject, setFilterSubject] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const { data, isLoading } = useGetMyAttendanceQuery({ month });
  const attendance = data?.data || [];
  const summary = data?.summary || {};

  // Derive subjects from records
  const subjects = [...new Map(
    attendance.filter(a => a.subject).map(a => [a.subject._id, a.subject])
  ).values()];

  const filtered = attendance.filter(a =>
    !filterSubject || a.subject?._id === filterSubject || a.attendanceType === 'hall'
  );

  const summaryCards = [
    { label: 'Total Classes', value: summary.total || 0, color: 'text-gray-700', bg: 'bg-white' },
    { label: 'Present', value: summary.present || 0, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
    { label: 'Absent', value: summary.absent || 0, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
    { label: 'Late', value: summary.late || 0, color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
    { label: 'Leave', value: summary.leave || 0, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    { label: 'Attendance %', value: `${summary.percentage || 0}%`, color: summary.percentage >= 75 ? 'text-green-700' : 'text-red-700', bg: 'bg-white' },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-5">My Attendance</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
        {summaryCards.map(({ label, value, color, bg }) => (
          <div key={label} className={`border rounded-lg p-3 text-center ${bg} border-gray-200`}>
            <div className={`text-xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</div>
          </div>
        ))}
      </div>

      {/* Attendance percentage bar */}
      {summary.total > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 mb-5">
          <div className="flex justify-between mb-1 text-xs text-gray-600">
            <span>Attendance: {summary.percentage}%</span>
            <span className={Number(summary.percentage) >= 75 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
              {Number(summary.percentage) >= 75 ? '✓ Good standing' : '⚠ Below 75% — attend more classes'}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${Number(summary.percentage) >= 75 ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(summary.percentage, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex flex-wrap gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Month</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Subject</label>
          <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Attendance Records</h2>
          <span className="text-xs text-gray-400">{filtered.length} records</span>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No attendance records found for this period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((a, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDate(a.date)}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {a.attendanceType === 'hall' ? (
                        <span className="text-purple-700 font-medium">Hall Attendance</span>
                      ) : (
                        a.subject?.name || '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {a.teacher ? `${a.teacher.firstName} ${a.teacher.lastName}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig[a.status]?.cls || 'bg-gray-100 text-gray-600'}`}>
                        {statusConfig[a.status]?.label || a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAttendance;
