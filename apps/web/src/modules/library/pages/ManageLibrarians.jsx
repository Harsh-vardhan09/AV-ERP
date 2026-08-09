/**
 * ManageLibrarians.jsx
 * ─────────────────────
 * Admin-only page: /admin/library/librarians
 * Uses dedicated /api/v1/library/librarians endpoints — fully independent
 * from staffController. School isolation guaranteed server-side via req.schoolId.
 * UI styled to match StaffManager.jsx (Tailwind, same patterns).
 */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useGetLibrariansQuery,
  useCreateLibrarianMutation,
  useUpdateLibrarianMutation,
  useToggleLibrarianStatusMutation,
  useResendLibrarianCredentialsMutation,
} from '../api/libraryApi';
import toast from 'react-hot-toast';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const initials = (fn, ln) => `${fn?.[0] || ''}${ln?.[0] || ''}`.toUpperCase() || '?';

// ── Inline Modal ──────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// ── Create / Edit Form ────────────────────────────────────────────────────────
const LibrarianForm = ({ initial, isEdit, onSubmit, loading, onCancel }) => {
  const [form, setForm] = useState(
    initial || { firstName: '', lastName: '', email: '', phone: '' }
  );
  const [err, setErr] = useState({});

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim())  e.lastName  = 'Required';
    if (!form.email.trim())     e.email     = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    setErr(e);
    return !Object.keys(e).length;
  };

  const submit = (e) => { e.preventDefault(); if (validate()) onSubmit(form); };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <input
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent ${err.firstName ? 'border-red-400' : 'border-gray-300'}`}
            value={form.firstName}
            onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
            placeholder="First name"
            disabled={loading}
          />
          {err.firstName && <p className="text-red-500 text-xs mt-1">{err.firstName}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <input
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent ${err.lastName ? 'border-red-400' : 'border-gray-300'}`}
            value={form.lastName}
            onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
            placeholder="Last name"
            disabled={loading}
          />
          {err.lastName && <p className="text-red-500 text-xs mt-1">{err.lastName}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
        <input
          type="email"
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent ${err.email ? 'border-red-400' : 'border-gray-300'} ${isEdit ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
          value={form.email}
          onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          placeholder="librarian@school.com"
          disabled={loading || isEdit}
        />
        {err.email && <p className="text-red-500 text-xs mt-1">{err.email}</p>}
        {isEdit && <p className="text-gray-400 text-xs mt-1">Email cannot be changed after account creation.</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
        <input
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
          value={form.phone || ''}
          onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
          placeholder="+91 XXXXX XXXXX"
          disabled={loading}
        />
      </div>

      {!isEdit && (
        <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          🔑 A secure temporary password will be auto-generated and emailed to this librarian.
          They must change it on first login. Their login ID is their email address.
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="bg-amber-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
          disabled={loading}
        >
          {loading ? 'Please wait…' : isEdit ? 'Update Librarian' : 'Create & Send Credentials'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-gray-300 text-gray-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const ManageLibrarians = () => {
  const rawUser     = useSelector(s => s?.user);
  const currentUser = rawUser?.user?.user || rawUser?.user || rawUser || {};

  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [confirm,    setConfirm]    = useState(null);

  const { data, isLoading, isError, refetch } = useGetLibrariansQuery(
    {
      ...(search ? { search } : {}),
      ...(statusFilter !== 'all' ? { isActive: statusFilter } : {}),
    },
    { pollingInterval: 30000 }
  );

  const [createLibrarian,  { isLoading: creating  }] = useCreateLibrarianMutation();
  const [updateLibrarian,  { isLoading: updating  }] = useUpdateLibrarianMutation();
  const [toggleStatus,     { isLoading: toggling  }] = useToggleLibrarianStatusMutation();
  const [resendCreds,      { isLoading: resending }] = useResendLibrarianCredentialsMutation();

  const librarians = data?.data?.librarians || [];
  const total   = librarians.length;
  const active  = librarians.filter(l => l.isActive).length;
  const pending = librarians.filter(l => l.mustChangePassword).length;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleCreate = async (form) => {
    try {
      const res = await createLibrarian(form).unwrap();
      toast.success(res.message || `Librarian created. Credentials sent to ${form.email}`);
      // If email failed, show credentials in a prominent toast
      if (res.data?.tempPassword) {
        toast(`Temp password: ${res.data.tempPassword}`, { duration: 10000, icon: '🔑' });
      }
      setShowCreate(false);
    } catch (e) {
      toast.error(e?.data?.message || 'Failed to create librarian account');
    }
  };

  const handleUpdate = async (form) => {
    try {
      await updateLibrarian({ id: editTarget._id, ...form }).unwrap();
      toast.success('Librarian details updated');
      setEditTarget(null);
    } catch (e) {
      toast.error(e?.data?.message || 'Update failed');
    }
  };

  const handleToggle = async () => {
    if (!confirm?.target) return;
    const action = confirm.target.isActive ? 'deactivate' : 'activate';
    try {
      await toggleStatus({ id: confirm.target._id, action }).unwrap();
      toast.success(`Librarian account ${action}d`);
    } catch (e) {
      toast.error(e?.data?.message || 'Action failed');
    }
    setConfirm(null);
  };

  const handleResend = async () => {
    if (!confirm?.target) return;
    try {
      await resendCreds(confirm.target._id).unwrap();
      toast.success(`New credentials sent to ${confirm.target.email}`);
    } catch (e) {
      toast.error(e?.data?.message || 'Resend failed');
    }
    setConfirm(null);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manage Librarians</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage library staff accounts for your school</p>
        </div>
        <button
          id="add-librarian-btn"
          onClick={() => setShowCreate(true)}
          className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium flex items-center gap-2"
        >
          + Add Librarian
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Librarians',      value: total,   cls: 'text-gray-800'  },
          { label: 'Active',                value: active,  cls: 'text-green-600' },
          { label: 'Pending Pwd Change',    value: pending, cls: 'text-amber-600' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border p-4 text-center">
            <div className={`text-3xl font-bold ${cls}`}>{value}</div>
            <div className="text-sm text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          className="flex-1 min-w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Isolation notice */}
      <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
        🔒 Librarian accounts are strictly isolated to your school — they cannot access any other school's data.
      </p>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading librarians…</div>
      ) : isError ? (
        <div className="text-center py-12 text-red-500">
          Failed to load librarian list.{' '}
          <button className="text-amber-600 hover:underline" onClick={refetch}>Retry</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Email', 'Status', 'Password', 'Created', 'Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {librarians.map(lib => {
                const isMe = lib._id === currentUser?._id;
                return (
                  <tr key={lib._id} className="border-t hover:bg-gray-50">
                    {/* Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {initials(lib.firstName, lib.lastName)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">
                            {lib.firstName} {lib.lastName}
                            {isMe && <span className="ml-1 text-amber-600 text-xs font-semibold">(You)</span>}
                          </div>
                          {lib.phone && <div className="text-xs text-gray-400">{lib.phone}</div>}
                        </div>
                      </div>
                    </td>
                    {/* Email */}
                    <td className="py-3 px-4 text-gray-600">{lib.email}</td>
                    {/* Status */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${lib.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {lib.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {/* Password */}
                    <td className="py-3 px-4">
                      {lib.mustChangePassword ? (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Must Change</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Password Set</span>
                      )}
                    </td>
                    {/* Created */}
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      <div>{fmt(lib.createdAt)}</div>
                      {lib.createdBy && (
                        <div className="text-gray-400">by {lib.createdBy.firstName} {lib.createdBy.lastName}</div>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="py-3 px-4">
                      <div className="flex gap-3 flex-wrap">
                        <button
                          onClick={() => setEditTarget(lib)}
                          className="text-amber-600 hover:text-amber-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirm({ type: 'resend', target: lib })}
                          className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                        >
                          Resend
                        </button>
                        {!isMe && (
                          <button
                            onClick={() => setConfirm({ type: 'toggle', target: lib })}
                            className={`text-sm font-medium ${lib.isActive ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                          >
                            {lib.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {librarians.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-14 text-gray-400">
                    <div className="text-4xl mb-2">📚</div>
                    <div className="font-medium">No librarian accounts yet.</div>
                    <div className="text-xs mt-1">Click <span className="font-semibold text-amber-600">+ Add Librarian</span> to create the first one.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Librarian Account">
        <LibrarianForm
          onSubmit={handleCreate}
          loading={creating}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Librarian">
        {editTarget && (
          <LibrarianForm
            initial={editTarget}
            isEdit
            onSubmit={handleUpdate}
            loading={updating}
            onCancel={() => setEditTarget(null)}
          />
        )}
      </Modal>

      {/* Confirm Dialog */}
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={
          confirm?.type === 'resend'
            ? 'Resend Credentials'
            : confirm?.target?.isActive
              ? 'Deactivate Librarian'
              : 'Activate Librarian'
        }
      >
        {confirm && (
          <div>
            <p className="text-sm text-gray-600 mb-5">
              {confirm.type === 'resend'
                ? `This will generate a new temporary password and email it to ${confirm.target.email}. They will be required to change it on next login.`
                : confirm.target.isActive
                  ? `Are you sure you want to deactivate ${confirm.target.firstName} ${confirm.target.lastName}? They will immediately lose library access.`
                  : `Re-activate ${confirm.target.firstName} ${confirm.target.lastName}? They will regain access to the library.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirm.type === 'resend' ? handleResend : handleToggle}
                disabled={resending || toggling}
                className={`px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors ${
                  confirm.type === 'resend'
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : confirm.target.isActive
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {resending || toggling ? 'Please wait…' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirm(null)}
                className="border border-gray-300 text-gray-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ManageLibrarians;
