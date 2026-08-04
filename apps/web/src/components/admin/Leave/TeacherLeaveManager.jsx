import React from 'react';
import { useGetTeacherLeavesQuery, useApproveTeacherLeaveMutation } from '@/redux/api/adminApi';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Calendar, User } from 'lucide-react';

const TeacherLeaveManager = () => {
  const { data: leavesData, isLoading } = useGetTeacherLeavesQuery();
  const [approveLeave] = useApproveTeacherLeaveMutation();

  const leaves = leavesData?.data || [];
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    approved: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  };

  const handleApprove = async (id) => {
    try {
      await approveLeave({ id, status: 'approved' }).unwrap();
      toast.success('Leave approved');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to approve leave');
    }
  };

  const handleReject = async (id) => {
    try {
      await approveLeave({ id, status: 'rejected' }).unwrap();
      toast.success('Leave rejected');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to reject leave');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading leave requests...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Teacher Leave Management</h2>

      {leaves.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
          No leave requests found
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Teacher</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Leave Type</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Dates</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Reason</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leaves.map((leave) => (
                <tr key={leave._id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {leave.appliedBy?.firstName} {leave.appliedBy?.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{leave.appliedBy?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 capitalize">{leave.leaveType}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate text-sm text-gray-600">{leave.reason}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[leave.status]}`}>
                      {leave.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {leave.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(leave._id)}
                          className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReject(leave._id)}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TeacherLeaveManager;
