/**
 * StaffManager.jsx
 * Staff management page for school admin — styled to match existing ERP UI.
 * Route: /admin/staff
 */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  useGetAllStaffQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useToggleStaffStatusMutation,
  useResendCredentialsMutation,
  useDeleteStaffMutation,
} from '../../redux/api/staffApi';
import toast from 'react-hot-toast';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const initials = (fn, ln) =>
  `${fn?.[0] || ''}${ln?.[0] || ''}`.toUpperCase() || '?';

const roleColors = {
  admin:           'bg-purple-100 text-purple-700',
  admission:       'bg-blue-100 text-blue-700',
  accounts:        'bg-green-100 text-green-700',
  librarian:       'bg-amber-100 text-amber-700',
  exam_controller: 'bg-rose-100 text-rose-700',
};
const roleLabel = { admin: 'Admin', admission: 'Admission', accounts: 'Accounts', librarian: 'Librarian', exam_controller: 'Exam Controller' };

const avatarColors = {
  admin:           'bg-purple-500',
  admission:       'bg-blue-500',
  accounts:        'bg-green-600',
  librarian:       'bg-amber-500',
  exam_controller: 'bg-rose-500',
};

// ── Inline Modal ──────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// ── Staff Form (create & edit) ────────────────────────────────────────────────
const StaffForm = ({ initial, isEdit, onSubmit, loading, onCancel, defaultRole = 'admission' }) => {
  const [form, setForm] = useState(
    initial || { firstName: '', lastName: '', email: '', role: defaultRole, phone: '' }
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
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${err.firstName ? 'border-red-400' : 'border-gray-300'}`}
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
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${err.lastName ? 'border-red-400' : 'border-gray-300'}`}
            value={form.lastName}
            onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
            placeholder="Last name"
            disabled={loading}
          />
          {err.lastName && <p className="text-red-500 text-xs mt-1">{err.lastName}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${err.email ? 'border-red-400' : 'border-gray-300'} ${isEdit ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
          value={form.email}
          onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          placeholder="staff@school.com"
          disabled={loading || isEdit}
        />
        {err.email && <p className="text-red-500 text-xs mt-1">{err.email}</p>}
        {isEdit && <p className="text-gray-400 text-xs mt-1">Email cannot be changed after account creation.</p>}
      </div>

      {isEdit ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
            value={roleLabel[form.role] || form.role}
            disabled
          />
          <p className="text-gray-400 text-xs mt-1">Role cannot be changed after creation.</p>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            value={form.role}
            onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
            disabled={loading}
          >
            <option value="admission">Admission Staff</option>
            <option value="accounts">Accounts Staff</option>
            <option value="librarian">Librarian</option>
            <option value="exam_controller">Exam Controller</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
        <input
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          value={form.phone || ''}
          onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
          placeholder="+91 XXXXX XXXXX"
          disabled={loading}
        />
      </div>

      {!isEdit && (
        <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          A temporary password will be auto-generated and emailed to this staff member. They must change it on first login.
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50" disabled={loading}>
          {loading ? 'Please wait…' : isEdit ? 'Update' : 'Create & Send Credentials'}
        </button>
        <button type="button" onClick={onCancel} className="border border-gray-300 text-gray-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const StaffManager = () => {
  const rawUser     = useSelector(s => s?.user);
  const currentUser = rawUser?.user?.user || rawUser?.user || rawUser || {};

  // Read initial role filter from URL (?role=exam_controller, etc.)
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || 'all';

  const [search,       setSearch]       = useState('');
  const [roleFilter,   setRoleFilter]   = useState(initialRole);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate,   setShowCreate]   = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [confirm,      setConfirm]      = useState(null); // { type, target }

  const { data, isLoading, isError } = useGetAllStaffQuery(
    { role: roleFilter, isActive: statusFilter, search },
    { pollingInterval: 30000 }
  );

  const [createStaff,   { isLoading: creating  }] = useCreateStaffMutation();
  const [updateStaff,   { isLoading: updating  }] = useUpdateStaffMutation();
  const [toggleStatus,  { isLoading: toggling  }] = useToggleStaffStatusMutation();
  const [resendCreds,   { isLoading: resending }] = useResendCredentialsMutation();
  const [deleteStaff,   { isLoading: deleting  }] = useDeleteStaffMutation();

  const staff  = data?.data?.staff || [];
  const total  = staff.length;
  const active = staff.filter(s => s.isActive).length;
  const pending = staff.filter(s => s.mustChangePassword).length;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleCreate = async (form) => {
    try {
      const res = await createStaff(form).unwrap();
      if (res?.emailSent === false) {
        // Account created but email failed — show temp password in warning toast
        toast(res.message, {
          icon: '⚠️',
          duration: 15000,
          style: { background: '#fffbeb', color: '#92400e', border: '1px solid #f59e0b', maxWidth: '500px' },
        });
      } else {
        toast.success(`Account created. Credentials sent to ${form.email}`);
      }
      setShowCreate(false);
    } catch (e) { toast.error(e?.data?.message || 'Failed to create staff'); }
  };

  const handleUpdate = async (form) => {
    try {
      await updateStaff({ id: editTarget._id, ...form }).unwrap();
      toast.success('Staff member updated');
      setEditTarget(null);
    } catch (e) { toast.error(e?.data?.message || 'Update failed'); }
  };

  const handleToggle = async () => {
    if (!confirm?.target) return;
    const action = confirm.target.isActive ? 'deactivate' : 'activate';
    try {
      await toggleStatus({ id: confirm.target._id, action }).unwrap();
      toast.success(`Account ${action}d`);
    } catch (e) { toast.error(e?.data?.message || 'Action failed'); }
    setConfirm(null);
  };

  const handleResend = async () => {
    if (!confirm?.target) return;
    try {
      const result = await resendCreds(confirm.target._id).unwrap();
      if (result?.data?.emailSent === false && result?.data?.tempPassword) {
        // Email failed — show credentials in toast so admin can share manually
        toast.error(
          `⚠️ Email delivery failed!\nShare manually:\nEmail: ${confirm.target.email}\nTemp Password: ${result.data.tempPassword}`,
          { duration: 15000 }
        );
      } else {
        toast.success(`New credentials sent to ${confirm.target.email}`);
      }
    } catch (e) { toast.error(e?.data?.message || 'Resend failed'); }
    setConfirm(null);
  };

  const handleDelete = async () => {
    if (!confirm?.target) return;
    const { firstName, lastName, email } = confirm.target;
    try {
      await deleteStaff(confirm.target._id).unwrap();
      toast.success(`🗑️ ${firstName} ${lastName} (${email}) has been permanently deleted.`, { duration: 5000 });
    } catch (e) { toast.error(e?.data?.message || 'Delete failed'); }
    setConfirm(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {roleFilter === 'exam_controller' ? '🎓 Exam Controller Accounts'
              : roleFilter === 'librarian'      ? '📚 Librarian Accounts'
              : roleFilter === 'admission'      ? '🎟️ Admission Staff'
              : roleFilter === 'accounts'       ? '💰 Accounts Staff'
              : 'Staff Management'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {roleFilter === 'exam_controller'
              ? 'Create and manage Exam Controller accounts for school-wide marks management'
              : 'Manage admission, accounts, librarian, and exam controller staff'}
          </p>
        </div>
        <button
          id="add-staff-btn"
          onClick={() => setShowCreate(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          + {roleFilter === 'exam_controller' ? 'Add Exam Controller' : 'Add Staff Member'}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Staff',            value: total,   cls: 'text-gray-800'  },
          { label: 'Active',                 value: active,  cls: 'text-green-600' },
          { label: 'Pending Password Change', value: pending, cls: 'text-amber-600' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border p-4 text-center">
            <div className={`text-3xl font-bold ${cls}`}>{value}</div>
            <div className="text-sm text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          className="flex-1 min-w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="admission">Admission</option>
          <option value="accounts">Accounts</option>
          <option value="librarian">Librarian</option>
          <option value="exam_controller">Exam Controller</option>
          <option value="admin">Admin</option>
        </select>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading staff…</div>
      ) : isError ? (
        <div className="text-center py-12 text-red-500">Failed to load staff list.</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Password</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Created</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(member => {
                const isMe = member._id === currentUser?._id;
                return (
                  <tr key={member._id} className="border-t hover:bg-gray-50">
                    {/* Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${avatarColors[member.role] || 'bg-gray-400'}`}>
                          {initials(member.firstName, member.lastName)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">
                            {member.firstName} {member.lastName}
                            {isMe && <span className="ml-1 text-indigo-600 text-xs font-semibold">(You)</span>}
                          </div>
                          {member.phone && <div className="text-xs text-gray-400">{member.phone}</div>}
                        </div>
                      </div>
                    </td>
                    {/* Email */}
                    <td className="py-3 px-4 text-gray-600">{member.email}</td>
                    {/* Role */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${roleColors[member.role] || 'bg-gray-100 text-gray-600'}`}>
                        {roleLabel[member.role] || member.role}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${member.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {/* Password */}
                    <td className="py-3 px-4">
                      {member.mustChangePassword ? (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                          Must Change
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                          Password Set
                        </span>
                      )}
                    </td>
                    {/* Created */}
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      <div>{fmt(member.createdAt)}</div>
                      {member.createdBy && (
                        <div className="text-gray-400">by {member.createdBy.firstName} {member.createdBy.lastName}</div>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="py-3 px-4 space-x-3">
                      <button
                        onClick={() => setEditTarget(member)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirm({ type: 'resend', target: member })}
                        className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                      >
                        Resend
                      </button>
                      {!isMe && member.role !== 'admin' && (
                        <>
                          <button
                            onClick={() => setConfirm({ type: 'toggle', target: member })}
                            className={`text-sm font-medium ${member.isActive ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                          >
                            {member.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setConfirm({ type: 'delete', target: member })}
                            className="text-sm font-medium text-red-700 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {staff.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-gray-400">
                    No staff members found. Click "Add Staff Member" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={roleFilter === 'exam_controller' ? 'Add Exam Controller Account' : 'Add Staff Member'}>
        <StaffForm
          defaultRole={roleFilter !== 'all' ? roleFilter : 'admission'}
          onSubmit={handleCreate}
          loading={creating}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Staff Member">
        {editTarget && (
          <StaffForm
            initial={editTarget}
            isEdit
            onSubmit={handleUpdate}
            loading={updating}
            onCancel={() => setEditTarget(null)}
          />
        )}
      </Modal>

      {/* Confirm dialog (resend / toggle) */}
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={
          confirm?.type === 'resend'  ? 'Resend Credentials'
          : confirm?.type === 'delete' ? '⚠️ Permanently Delete Account'
          : confirm?.target?.isActive  ? 'Deactivate Staff Member'
          : 'Activate Staff Member'
        }
      >
        {confirm && (
          <div>
            {/* ── Delete confirmation (destructive) ── */}
            {confirm.type === 'delete' && (
              <div className="mb-5">
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="text-red-500 text-xl mt-0.5">🗑️</div>
                  <div>
                    <p className="text-sm font-semibold text-red-800 mb-1">This action cannot be undone.</p>
                    <p className="text-sm text-red-700">
                      You are about to permanently delete the account for
                      <strong> {confirm.target.firstName} {confirm.target.lastName}</strong>.
                    </p>
                    <p className="text-xs text-red-500 mt-2 font-mono">{confirm.target.email}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Their login credentials, role (<strong>{roleLabel[confirm.target.role] || confirm.target.role}</strong>), and all associated account data will be removed from the system.
                </p>
              </div>
            )}

            {/* ── Resend / Toggle confirmation ── */}
            {confirm.type !== 'delete' && (
              <p className="text-sm text-gray-600 mb-5">
                {confirm.type === 'resend'
                  ? `This will generate a new temporary password and email it to ${confirm.target.email}. They will be required to change it on next login.`
                  : confirm.target.isActive
                    ? `Are you sure you want to deactivate ${confirm.target.firstName} ${confirm.target.lastName}? They will not be able to log in.`
                    : `Re-activate ${confirm.target.firstName} ${confirm.target.lastName}? They will regain access to the system.`}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={
                  confirm.type === 'delete'  ? handleDelete
                  : confirm.type === 'resend' ? handleResend
                  : handleToggle
                }
                disabled={resending || toggling || deleting}
                className={`px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${
                  confirm.type === 'delete'  ? 'bg-red-600 hover:bg-red-700'
                  : confirm.type === 'resend' ? 'bg-indigo-600 hover:bg-indigo-700'
                  : confirm.target.isActive   ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {(resending || toggling || deleting) ? 'Please wait…'
                  : confirm.type === 'delete' ? 'Yes, Delete Permanently'
                  : 'Confirm'}
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

export default StaffManager;
