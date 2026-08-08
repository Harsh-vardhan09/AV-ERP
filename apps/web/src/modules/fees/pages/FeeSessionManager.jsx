import React, { useState } from 'react';
import { FiCalendar, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useGetFeeSessionsQuery } from '@modules/fees/api/feeApi';
import { useGetSessionsQuery } from '../../../redux/api/adminApi';

// Direct fetch helpers for session CRUD actions (PATCH/DELETE) not in RTK
const API_BASE = `${import.meta.env.VITE_PORT}/api/v1/fee`;

const apiCall = async (method, path, body) => {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json;
};

const StatusBadge = ({ active }) =>
  active ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Inactive
    </span>
  );

const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[1, 2, 3, 4, 5].map((i) => (
      <td key={i} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded w-3/4" /></td>
    ))}
  </tr>
);

const FeeSessionManager = () => {
  const { data, isLoading, refetch } = useGetFeeSessionsQuery();
  const { data: globalSessionsData, isLoading: isGlobalLoading } = useGetSessionsQuery();

  const [showModal, setShowModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionLoading, setAction] = useState(null);

  // Backend returns { success, data: [...sessions], pagination }
  const sessions = data?.data || [];
  const globalSessions = globalSessionsData?.data || [];

  const closeModal = () => { setShowModal(false); setSelectedSessionId(''); };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!selectedSessionId) {
      toast.error('Please select a session');
      return;
    }
    const sessionToCreate = globalSessions.find(s => s._id === selectedSessionId);
    if (!sessionToCreate) return;

    setSaving(true);
    try {
      await apiCall('POST', '/sessions', {
        name: sessionToCreate.name,
        startDate: sessionToCreate.startDate,
        endDate: sessionToCreate.endDate
      });
      toast.success('Session created');
      await refetch();
      closeModal();
    } catch (err) {
      toast.error(err.message || 'Failed to create session');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id) => {
    setAction(`activate-${id}`);
    try {
      // Backend route: PATCH /sessions/:id/activate
      await apiCall('PATCH', `/sessions/${id}/activate`);
      toast.success('Session activated');
      await refetch();
    } catch (err) {
      toast.error(err.message || 'Failed to activate session');
    } finally {
      setAction(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete session "${name}"? This cannot be undone.`)) return;
    setAction(`delete-${id}`);
    try {
      // Backend: DELETE /sessions/:id
      await apiCall('DELETE', `/sessions/${id}`);
      toast.success('Session deleted');
      await refetch();
    } catch (err) {
      toast.error(err.message || 'Failed to delete session');
    } finally {
      setAction(null);
    }
  };

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '—');

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Academic Sessions</h2>
        <p className="text-xs text-gray-400 mt-0.5">Manage fee collection sessions</p>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {!isLoading && sessions.length === 0 && (
          <div className="py-16 text-center">
            <FiCalendar size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm font-medium">No sessions yet</p>
            <p className="text-gray-300 text-xs mt-1">Contact administrator to create sessions</p>
          </div>
        )}

        {(isLoading || sessions.length > 0) && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Duration</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 w-44" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading
                ? [1, 2, 3].map((i) => <SkeletonRow key={i} />)
                : sessions.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-900">{s.name}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {fmtDate(s.startDate)} — {fmtDate(s.endDate)}
                    </td>
                    <td className="py-3 px-4"><StatusBadge active={s.isActive} /></td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {!s.isActive && (
                          <button
                            onClick={() => handleActivate(s._id)}
                            disabled={actionLoading === `activate-${s._id}`}
                            className="text-green-600 hover:text-green-700 text-xs font-medium transition disabled:opacity-50"
                          >
                            {actionLoading === `activate-${s._id}` ? '…' : 'Activate'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(s._id, s.name)}
                          disabled={actionLoading === `delete-${s._id}`}
                          className="text-gray-300 hover:text-red-600 transition disabled:opacity-50"
                          title="Delete"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && sessions.length > 0 && (
        <p className="text-xs text-gray-400 mt-2 px-1">
          {sessions.length} session{sessions.length !== 1 ? 's' : ''} ·{' '}
          {sessions.filter((s) => s.isActive).length} active
        </p>
      )}

      {/* Add Session Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">New Academic Session</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Select Session <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  disabled={isGlobalLoading}
                >
                  <option value="">{isGlobalLoading ? 'Loading sessions...' : '-- Select a Session --'}</option>
                  {globalSessions.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({fmtDate(s.startDate)} — {fmtDate(s.endDate)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg border border-gray-200 transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {saving ? 'Creating…' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeSessionManager;
