import React from 'react';
import { useGetStudentLeavesQuery, useApproveStudentLeaveMutation } from '../../../redux/api/teacherApi';
import toast from 'react-hot-toast';

const StudentLeaveApproval = () => {
  const { data } = useGetStudentLeavesQuery();
  const [approveLeave] = useApproveStudentLeaveMutation();
  const leaves = data?.data || [];
  const statusColors = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };

  const handleAction = async (id, status) => {
    try {
      await approveLeave({ id, status }).unwrap();
      toast.success(`Leave ${status}`);
    } catch (err) { toast.error(err?.data?.message || 'Error'); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Student Leave Requests</h1>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 text-gray-600">Student</th>
              <th className="text-left py-3 px-4 text-gray-600">Type</th>
              <th className="text-left py-3 px-4 text-gray-600">Dates</th>
              <th className="text-left py-3 px-4 text-gray-600">Reason</th>
              <th className="text-left py-3 px-4 text-gray-600">Status</th>
              <th className="text-left py-3 px-4 text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map(l => (
              <tr key={l._id} className="border-t hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{l.appliedBy?.firstName} {l.appliedBy?.lastName}</td>
                <td className="py-3 px-4 capitalize">{l.leaveType}</td>
                <td className="py-3 px-4 text-xs">{new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}</td>
                <td className="py-3 px-4 max-w-xs truncate">{l.reason}</td>
                <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[l.status]}`}>{l.status}</span></td>
                <td className="py-3 px-4 space-x-2">
                  {l.status === 'pending' && (
                    <>
                      <button onClick={() => handleAction(l._id, 'approved')} className="text-green-600 hover:text-green-800 text-sm">✓</button>
                      <button onClick={() => handleAction(l._id, 'rejected')} className="text-red-600 hover:text-red-800 text-sm">✕</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {leaves.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-gray-500">No student leave requests</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentLeaveApproval;
