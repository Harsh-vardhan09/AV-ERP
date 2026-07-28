import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BASE = `${import.meta.env.VITE_PORT}/api/v1/fingerprint`;

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS = {
  present: { label: 'Present', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  late:    { label: 'Late',    bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  absent:  { label: 'Absent', bg: 'bg-red-100',    text: 'text-red-700',   dot: 'bg-red-400' },
  half_day:{ label: 'Half Day', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-400' },
  on_leave:{ label: 'On Leave', bg: 'bg-blue-100', text: 'text-blue-700',  dot: 'bg-blue-400' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS[status] || STATUS.absent;
  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

// Always display in IST (Asia/Kolkata) so time matches device punch time
const IST = 'Asia/Kolkata';
const fmt = (d) => d
  ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: IST })
  : '—';
const fmtDateTime = (d) => d
  ? new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short', timeZone: IST })
  : '—';
// Get today's date in IST (not UTC — can differ by 1 day before 5:30am IST)
const today = () => {
  const d = new Date();
  return d.toLocaleDateString('en-CA', { timeZone: IST }); // en-CA gives YYYY-MM-DD format
};

// ─── Manual Correction Modal ──────────────────────────────────────────────────
const ManualModal = ({ record, onClose, onSaved }) => {
  const [form, setForm] = useState({
    facultyId: record?.facultyId?._id || '',
    date: record?.date ? record.date.slice(0, 10) : today(),
    punchIn: record?.punchIn ? new Date(record.punchIn).toTimeString().slice(0, 5) : '',
    punchOut: record?.punchOut ? new Date(record.punchOut).toTimeString().slice(0, 5) : '',
    status: record?.status || 'present',
    note: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.post(`${BASE}/attendance/manual`, {
        ...form,
        punchIn: form.punchIn ? `${form.date}T${form.punchIn}:00` : undefined,
        punchOut: form.punchOut ? `${form.date}T${form.punchOut}:00` : undefined,
      }, { withCredentials: true });
      onSaved();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Manual Attendance Correction</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Punch In</label>
              <input type="time" value={form.punchIn} onChange={e => setForm(p => ({ ...p, punchIn: e.target.value }))}
                className="input-field mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Punch Out</label>
              <input type="time" value={form.punchOut} onChange={e => setForm(p => ({ ...p, punchOut: e.target.value }))}
                className="input-field mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
              className="input-field mt-1">
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Note</label>
            <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              placeholder="Reason for correction..." className="input-field mt-1" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 bg-indigo-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-indigo-700">
            {loading ? 'Saving...' : 'Save Correction'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const FacultyAttendance = () => {
  const [date, setDate] = useState(today());
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ total: 0, present: 0, late: 0, absent: 0, halfDay: 0, onLeave: 0 });
  const [loading, setLoading] = useState(false);
  const [editRecord, setEditRecord] = useState(null);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${BASE}/attendance`, {
        params: { date },
        withCredentials: true,
      });
      setRecords(Array.isArray(data?.data) ? data.data : []);
      setSummary(data?.summary ?? { total: 0, present: 0, late: 0, absent: 0, halfDay: 0, onLeave: 0 });
    } catch {
      // Reset to safe defaults on error so UI doesn't crash
      setRecords([]);
      setSummary({ total: 0, present: 0, late: 0, absent: 0, halfDay: 0, onLeave: 0 });
    } finally { setLoading(false); }
  }, [date]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const summaryCards = [
    { label: 'Total Faculty', value: summary.total || 0, color: 'text-gray-800', bg: 'bg-white' },
    { label: 'Present', value: summary.present || 0, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Late', value: summary.late || 0, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Absent', value: summary.absent || 0, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Half Day', value: summary.halfDay || 0, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'On Leave', value: summary.onLeave || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Faculty Attendance</h1>
            <p className="text-gray-500 text-sm mt-0.5">Biometric data from MORX fingerprint devices</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="input-field !w-auto" />
            <button onClick={fetchAttendance}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {summaryCards.map(c => (
            <div key={c.label} className={`${c.bg} rounded-xl shadow-sm p-4 border border-gray-100`}>
              <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
              <div className="text-xs text-gray-500 mt-1">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Attendance Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-16 text-gray-400">Loading...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  {['Faculty', 'Designation', 'Punch In', 'Punch Out', 'Total Hours', 'Status', 'Source', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(Array.isArray(records) ? records : []).map(r => {
                  const f = r.facultyId || {};
                  return (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {f.documents?.photo
                            ? <img src={f.documents.photo} alt="" className="w-8 h-8 rounded-full object-cover" />
                            : <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xs">
                                {(f.firstName?.[0] || '') + (f.lastName?.[0] || '')}
                              </div>
                          }
                          <div>
                            <div className="font-medium text-gray-800">{f.firstName} {f.lastName}</div>
                            <div className="text-xs text-gray-400">{f.employeeId || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{f.designation || '—'}</td>
                      <td className="px-4 py-3 font-mono text-gray-700">{fmt(r.punchIn)}</td>
                      <td className="px-4 py-3 font-mono text-gray-700">{fmt(r.punchOut)}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {r.totalHours ? `${r.totalHours.toFixed(1)} hr` : '—'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          r.source === 'device' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {r.source === 'device' ? '🖥️ Device' : '✏️ Manual'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setEditRecord(r)}
                          className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600">
                          Correct
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!records.length && !loading && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      <div className="text-3xl mb-2">📋</div>
                      No attendance records for {date}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Raw Punches tooltip note */}
        <p className="text-xs text-gray-400 mt-3 text-center">
          First punch = Check In · Last punch = Check Out · All raw punches stored for audit trail
        </p>
      </div>

      {/* Manual Correction Modal */}
      {editRecord && (
        <ManualModal
          record={editRecord}
          onClose={() => setEditRecord(null)}
          onSaved={fetchAttendance}
        />
      )}

      <style>{`
        .input-field {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 14px;
          width: 100%;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-field:focus { border-color: #6366f1; }
      `}</style>
    </div>
  );
};

export default FacultyAttendance;
