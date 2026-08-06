import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BASE = `${import.meta.env.VITE_PORT}/api/v1/fingerprint`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const copyToClipboard = (text) => { navigator.clipboard.writeText(text); };

const Badge = ({ label, color }) => {
  const colors = {
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-500',
    blue: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray}`}>
      {label}
    </span>
  );
};

// ─── Tab: Devices ─────────────────────────────────────────────────────────────
const DevicesTab = () => {
  const [devices, setDevices] = useState([]);
  const [form, setForm] = useState({ deviceName: '', serialNumber: '', location: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchDevices = useCallback(async () => {
    try {
      const { data } = await axios.get(BASE + '/device', { withCredentials: true });
      setDevices(Array.isArray(data?.data) ? data.data : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(BASE + '/device', form, { withCredentials: true });
      setMsg(`✅ Device registered! Token: ${data.data.token}`);
      setForm({ deviceName: '', serialNumber: '', location: '' });
      fetchDevices();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.message || 'Error'));
    } finally { setLoading(false); }
  };

  const handleToggle = async (id) => {
    await axios.patch(`${BASE}/device/${id}/toggle`, {}, { withCredentials: true });
    fetchDevices();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this device and all its faculty mappings?')) return;
    await axios.delete(`${BASE}/device/${id}`, { withCredentials: true });
    fetchDevices();
  };

  return (
    <div className="space-y-6">
      {/* Add Device Form */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Register New Device</h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input required value={form.deviceName} onChange={e => setForm(p => ({ ...p, deviceName: e.target.value }))}
            placeholder="Device Name (e.g. Main Gate)" className="input-field" />
          <input value={form.serialNumber} onChange={e => setForm(p => ({ ...p, serialNumber: e.target.value }))}
            placeholder="Serial Number (optional)" className="input-field" />
          <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
            placeholder="Location (e.g. Staff Room)" className="input-field" />
          <button type="submit" disabled={loading}
            className="sm:col-span-3 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium transition">
            {loading ? 'Registering...' : '+ Register Device'}
          </button>
        </form>
        {msg && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800 break-all">
            {msg}
          </div>
        )}
      </div>

      {/* Device List */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              {['Device', 'Location', 'Token', 'Push URL', 'Last Ping', 'Punches', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Array.isArray(devices) && devices.map(d => (
              <tr key={d._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">
                  {d.deviceName}
                  {d.serialNumber && <div className="text-xs text-gray-400">{d.serialNumber}</div>}
                </td>
                <td className="px-4 py-3 text-gray-600">{d.location || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded max-w-[90px] truncate">{d.token}</code>
                    <button onClick={() => { copyToClipboard(d.token); alert('Token copied!'); }}
                      className="text-indigo-500 hover:text-indigo-700 text-xs">Copy</button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => copyToClipboard(`${window.location.origin}/api/v1/device/punch`)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">
                    Copy URL
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {d.lastPingAt
                    ? new Date(d.lastPingAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })
                    : 'Never'}
                </td>
                <td className="px-4 py-3 text-gray-700">{d.totalPunches || 0}</td>
                <td className="px-4 py-3">
                  <Badge label={d.isActive ? 'Active' : 'Inactive'} color={d.isActive ? 'green' : 'red'} />
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => handleToggle(d._id)}
                    className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100">
                    {d.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => handleDelete(d._id)}
                    className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!devices.length && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">No devices registered yet</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

// ─── Tab: Faculty Mapping ─────────────────────────────────────────────────────
const MappingTab = () => {
  const [mappings, setMappings] = useState([]);
  const [devices, setDevices] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [form, setForm] = useState({ deviceId: '', facultyId: '', deviceUserId: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [m, d, f] = await Promise.all([
        axios.get(BASE + '/mapping', { withCredentials: true }),
        axios.get(BASE + '/device', { withCredentials: true }),
        axios.get(`${import.meta.env.VITE_PORT}/api/v1/admin/teachers`, { withCredentials: true }),
      ]);
      setMappings(Array.isArray(m?.data?.data) ? m.data.data : []);
      setDevices(Array.isArray(d?.data?.data) ? d.data.data : []);
      setFaculty(Array.isArray(f?.data?.data) ? f.data.data : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(BASE + '/mapping', form, { withCredentials: true });
      setMsg('✅ Faculty mapped successfully');
      setForm({ deviceId: '', facultyId: '', deviceUserId: '' });
      fetchAll();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.message || 'Error'));
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    await axios.delete(`${BASE}/mapping/${id}`, { withCredentials: true });
    fetchAll();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Map Faculty to Device</h3>
        <p className="text-xs text-gray-500 mb-4">
          Enter the User ID assigned to the faculty member inside the physical device (e.g. 001, 002).
        </p>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select required value={form.deviceId} onChange={e => setForm(p => ({ ...p, deviceId: e.target.value }))}
            className="input-field">
            <option value="">Select Device</option>
            {(Array.isArray(devices) ? devices : []).filter(d => d.isActive).map(d => (
              <option key={d._id} value={d._id}>{d.deviceName}</option>
            ))}
          </select>
          <select required value={form.facultyId} onChange={e => setForm(p => ({ ...p, facultyId: e.target.value }))}
            className="input-field">
            <option value="">Select Faculty</option>
            {(Array.isArray(faculty) ? faculty : []).map(f => (
              <option key={f._id} value={f._id}>
                {f.firstName} {f.lastName} ({f.employeeId || 'N/A'})
              </option>
            ))}
          </select>
          <input required value={form.deviceUserId}
            onChange={e => setForm(p => ({ ...p, deviceUserId: e.target.value }))}
            placeholder="Device User ID (e.g. 001)" className="input-field" />
          <button type="submit" disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium transition">
            {loading ? 'Saving...' : 'Map Faculty'}
          </button>
        </form>
        {msg && <div className="mt-3 p-2 bg-blue-50 text-blue-700 text-sm rounded">{msg}</div>}
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[580px]">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              {['Faculty', 'Employee ID', 'Device', 'Device User ID', 'Enrolled On', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(Array.isArray(mappings) ? mappings : []).map(m => (
              <tr key={m._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">
                  {m.facultyId?.firstName} {m.facultyId?.lastName}
                </td>
                <td className="px-4 py-3 text-gray-500">{m.facultyId?.employeeId || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{m.deviceId?.deviceName}</td>
                <td className="px-4 py-3">
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{m.deviceUserId}</code>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(m.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(m._id)}
                    className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {!mappings.length && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No mappings yet</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

// ─── Tab: Queue Health ────────────────────────────────────────────────────────
const QueueTab = () => {
  const [stats, setStats] = useState(null);
  const fetchStats = async () => {
    try {
      const { data } = await axios.get(BASE + '/queue/stats', { withCredentials: true });
      setStats(data.data);
    } catch { /* ignore */ }
  };
  useEffect(() => { fetchStats(); const t = setInterval(fetchStats, 5000); return () => clearInterval(t); }, []);

  const statCards = stats ? [
    { label: 'Waiting', value: stats.waiting, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Processing', value: stats.active, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Completed', value: stats.completed, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Failed', value: stats.failed, color: 'text-red-600', bg: 'bg-red-50' },
  ] : [];

  return (
    <div>
      <p className="text-xs text-gray-500 mb-4">Live queue stats (auto-refresh every 5s)</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map(c => (
          <div key={c.label} className={`rounded-xl p-5 ${c.bg}`}>
            <div className={`text-3xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-sm text-gray-600 mt-1">{c.label}</div>
          </div>
        ))}
        {!stats && <div className="col-span-4 text-center py-8 text-gray-400">Loading queue stats... (Redis must be running)</div>}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
// ─── Tab: CSV Upload ─────────────────────────────────────────────────────────
const CSVUploadTab = () => {
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(BASE + '/device', { withCredentials: true })
      .then(r => setDevices(Array.isArray(r.data?.data) ? r.data.data : []))
      .catch(() => {});
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !deviceId) return;
    setLoading(true); setResult(null); setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('deviceId', deviceId);
      const { data } = await axios.post(BASE + '/attendance/upload-csv', form, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">📤 Upload Attendance CSV</h2>
      <p className="text-sm text-gray-500 mb-5">
        Download the attendance log from your MORX device software, then upload the CSV here.
        The system will automatically match punch records to faculty via their Device User ID.
      </p>

      {/* Format guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-5 text-xs text-blue-700">
        <strong>Supported CSV columns (any of these names work):</strong>
        <ul className="mt-1 list-disc list-inside space-y-0.5">
          <li><strong>User ID column:</strong> User ID, No., EmpCode, EnrollNo, ID</li>
          <li><strong>Time column:</strong> Date Time, DateTime, PunchTime, Time, CheckTime, Timestamp</li>
        </ul>
      </div>

      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Device (source of CSV)</label>
          <select value={deviceId} onChange={e => setDeviceId(e.target.value)}
            required className="input-field">
            <option value="">-- Select device --</option>
            {devices.map(d => (
              <option key={d._id} value={d._id}>{d.deviceName} ({d.location || 'No location'})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CSV File</label>
          <input type="file" accept=".csv,.txt"
            onChange={e => setFile(e.target.files[0])}
            required
            className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
          {file && <p className="text-xs text-gray-400 mt-1">Selected: {file.name} ({(file.size/1024).toFixed(1)} KB)</p>}
        </div>

        <button type="submit" disabled={loading || !file || !deviceId}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
          {loading ? '⏳ Processing...' : '📤 Upload & Process'}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className="mt-5 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="font-medium text-green-800 mb-2">✅ {result.message}</p>
          <div className="flex gap-6 text-sm text-green-700">
            <span>✔ Processed: <strong>{result.data?.processed}</strong></span>
            <span>⏭ Skipped: <strong>{result.data?.skipped}</strong></span>
          </div>
          {result.data?.errors?.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-yellow-700 cursor-pointer">⚠ {result.data.errors.length} row(s) had issues (click to see)</summary>
              <ul className="mt-2 text-xs text-yellow-600 space-y-1 list-disc list-inside max-h-40 overflow-y-auto">
                {result.data.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          ❌ {error}
        </div>
      )}
    </div>
  );
};


const DeviceManagement = () => {
  const [activeTab, setActiveTab] = useState('devices');
  const tabs = [
    { id: 'devices', label: '🖥️ Devices' },
    { id: 'mapping', label: '👤 Faculty Mapping' },
    { id: 'csv',     label: '📤 Upload CSV' },
    { id: 'queue',   label: '📊 Queue Health' },
  ];

  return (
    <div className="bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Biometric Device Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage MORX fingerprint devices and faculty mappings for automated attendance
          </p>
        </div>

        {/* Tabs — scrollable on mobile */}
        <div className="overflow-x-auto mb-6 pb-1">
        <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1 w-max min-w-full sm:w-fit">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
                }`}>
              {tab.label}
            </button>
          ))}
        </div>
        </div>

        {activeTab === 'devices' && <DevicesTab />}
        {activeTab === 'mapping' && <MappingTab />}
        {activeTab === 'csv'     && <CSVUploadTab />}
        {activeTab === 'queue'   && <QueueTab />}
      </div>

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

export default DeviceManagement;
