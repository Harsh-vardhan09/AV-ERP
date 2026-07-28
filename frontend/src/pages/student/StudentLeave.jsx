import React, { useState } from 'react';
import { useApplyStudentLeaveMutation, useGetMyStudentLeavesQuery } from '../../redux/api/studentApi';
import toast from 'react-hot-toast';
import { Calendar, FileText, CheckCircle2, Clock } from 'lucide-react';

const statusColors = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200'
};

const StudentLeave = () => {
  const [applyLeave] = useApplyStudentLeaveMutation();
  const { data, isLoading } = useGetMyStudentLeavesQuery();
  const [form, setForm] = useState({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
  const leaves = data?.data || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await applyLeave(form).unwrap();
      toast.success('Leave applied successfully');
      setForm({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to apply for leave');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 pb-10">
      
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Apply Leave</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Submit new leave requests and check your application status history</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* New Leave Request Form */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs h-fit">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">New Leave Request</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Leave Type */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Leave Type</label>
              <select 
                value={form.leaveType} 
                onChange={e => setForm({ ...form, leaveType: e.target.value })} 
                className="w-full border border-slate-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm outline-none bg-white font-medium text-slate-800 cursor-pointer"
              >
                <option value="casual">Casual</option>
                <option value="sick">Sick</option>
                <option value="personal">Personal</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
                <input 
                  type="date" 
                  value={form.startDate} 
                  onChange={e => setForm({ ...form, startDate: e.target.value })} 
                  required 
                  className="w-full border border-slate-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm outline-none font-medium text-slate-800 cursor-pointer" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Date</label>
                <input 
                  type="date" 
                  value={form.endDate} 
                  onChange={e => setForm({ ...form, endDate: e.target.value })} 
                  required 
                  className="w-full border border-slate-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm outline-none font-medium text-slate-800 cursor-pointer" 
                />
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</label>
              <textarea 
                value={form.reason} 
                onChange={e => setForm({ ...form, reason: e.target.value })} 
                placeholder="Reason for leave..." 
                required 
                rows={3} 
                className="w-full border border-slate-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm outline-none font-medium text-slate-800 resize-none" 
              />
            </div>

            {/* Submit */}
            <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-bold shadow-xs transition cursor-pointer"
            >
              Submit Application
            </button>

          </form>
        </div>

        {/* Leave History List */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Leave History</h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">{leaves.length} applications</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/30 text-left text-xs text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-5">Type</th>
                    <th className="py-3 px-5">Dates</th>
                    <th className="py-3 px-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {leaves.map((l) => (
                    <tr key={l._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-5 capitalize text-slate-800 font-semibold">{l.leaveType}</td>
                      <td className="py-3.5 px-5 text-slate-500 text-xs tabular-nums">
                        {new Date(l.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(l.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColors[l.status] || 'bg-slate-100 text-slate-600 border-slate-200'} capitalize`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {leaves.length === 0 && (
                    <tr>
                      <td colSpan="3" className="text-center py-12 text-slate-400 font-medium">
                        No leave records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default StudentLeave;
