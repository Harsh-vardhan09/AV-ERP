import React, { useState } from 'react';
import { useApplyStudentLeaveMutation, useGetMyStudentLeavesQuery } from '../../redux/api/studentApi';
import toast from 'react-hot-toast';

const StudentLeave = () => {
  const [applyLeave] = useApplyStudentLeaveMutation();
  const { data } = useGetMyStudentLeavesQuery();
  const [form, setForm] = useState({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
  const leaves = data?.data || [];
  const statusColors = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await applyLeave(form).unwrap();
      toast.success('Leave applied');
      setForm({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
    } catch (err) { toast.error(err?.data?.message || 'Error'); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Apply Leave</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="font-semibold mb-3">New Leave Request</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <select value={form.leaveType} onChange={e => setForm({ ...form, leaveType: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="casual">Casual</option><option value="sick">Sick</option><option value="personal">Personal</option><option value="other">Other</option>
            </select>
            <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required className="w-full border rounded-lg px-3 py-2 text-sm" />
            <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Reason for leave" required rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium w-full hover:bg-blue-700">Submit</button>
          </form>
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b"><h3 className="font-semibold text-gray-700">Leave History</h3></div>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left py-2 px-4 text-gray-500">Type</th><th className="text-left py-2 px-4 text-gray-500">Dates</th><th className="text-left py-2 px-4 text-gray-500">Status</th></tr></thead>
            <tbody>
              {leaves.map(l => (
                <tr key={l._id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-4 capitalize">{l.leaveType}</td>
                  <td className="py-2 px-4 text-xs">{new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}</td>
                  <td className="py-2 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[l.status]}`}>{l.status}</span></td>
                </tr>
              ))}
              {leaves.length === 0 && <tr><td colSpan="3" className="text-center py-6 text-gray-500">No leaves</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentLeave;
