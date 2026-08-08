import React, { useState, useMemo } from 'react';
import { useApplyStudentLeaveMutation, useGetMyStudentLeavesQuery } from '@modules/people/api/studentApi';
import toast from 'react-hot-toast';
import { Plus, X, Calendar, Clock } from 'lucide-react';

const statusConfig = {
  pending: { label: 'Pending', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', bg: 'bg-rose-50 text-rose-700 border-rose-200' }
};

const StudentLeave = () => {
  const [applyLeave, { isLoading: isSubmitting }] = useApplyStudentLeaveMutation();
  const { data, isLoading } = useGetMyStudentLeavesQuery();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [form, setForm] = useState({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });

  const leaves = useMemo(() => data?.data || [], [data]);

  const stats = useMemo(() => {
    return {
      all: leaves.length,
      pending: leaves.filter(l => l.status === 'pending').length,
      approved: leaves.filter(l => l.status === 'approved').length,
      rejected: leaves.filter(l => l.status === 'rejected').length
    };
  }, [leaves]);

  const filteredLeaves = useMemo(() => {
    if (activeTab === 'all') return leaves;
    return leaves.filter(l => l.status === activeTab);
  }, [leaves, activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast.error('End Date cannot be before Start Date');
      return;
    }
    try {
      await applyLeave(form).unwrap();
      toast.success('Leave applied successfully');
      setForm({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
      setIsModalOpen(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to submit leave');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 px-2 sm:px-4 pb-12">
      
      {/* Responsive Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Leave Applications</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage and track your leave applications</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 sm:py-2 rounded-xl transition cursor-pointer shadow-xs active:scale-98"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Apply Leave</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
        
        {/* Horizontal Scrollable Tabs on Mobile */}
        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none">
          {[
            { id: 'all', label: 'All', count: stats.all },
            { id: 'pending', label: 'Pending', count: stats.pending },
            { id: 'approved', label: 'Approved', count: stats.approved },
            { id: 'rejected', label: 'Rejected', count: stats.rejected },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="capitalize">{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                activeTab === tab.id ? 'bg-slate-100 text-slate-700 font-bold' : 'bg-slate-200/60 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content List */}
        {isLoading ? (
          <div className="text-center py-12 text-xs text-slate-400">Loading...</div>
        ) : filteredLeaves.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">No leave records found</div>
        ) : (
          <div>
            {/* Desktop Table View (Hidden on Mobile) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/30 text-left text-slate-400 font-medium">
                    <th className="py-2.5 px-4 font-semibold">Type</th>
                    <th className="py-2.5 px-4 font-semibold">Dates</th>
                    <th className="py-2.5 px-4 font-semibold">Reason</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredLeaves.map((l) => {
                    const cfg = statusConfig[l.status] || statusConfig.pending;
                    return (
                      <tr key={l._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900 capitalize">{l.leaveType}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(l.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(l.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{l.reason}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${cfg.bg}`}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (Visible on Mobile) */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {filteredLeaves.map((l) => {
                const cfg = statusConfig[l.status] || statusConfig.pending;
                return (
                  <div key={l._id} className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs capitalize">{l.leaveType} Leave</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${cfg.bg}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {new Date(l.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} → {new Date(l.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {l.reason && (
                      <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {l.reason}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Responsive Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <h2 className="text-sm font-bold text-slate-900">Apply for Leave</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
              
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Leave Type</label>
                <select
                  value={form.leaveType}
                  onChange={e => setForm({ ...form, leaveType: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
                >
                  <option value="casual">Casual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal Leave</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                    required
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                    required
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Reason</label>
                <textarea
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  placeholder="Reason for taking leave..."
                  required
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none focus:border-slate-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default StudentLeave;


