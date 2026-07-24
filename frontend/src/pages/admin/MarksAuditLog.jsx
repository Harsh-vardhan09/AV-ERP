import React, { useState } from 'react';
import { useGetMarksAuditLogQuery, useGetActiveSessionQuery, useGetClassesQuery } from '../../redux/api/adminApi';

const MarksAuditLog = () => {
  const { data: sessionData } = useGetActiveSessionQuery();
  const sessionId = sessionData?.data?._id;
  const { data: classData } = useGetClassesQuery(sessionId, { skip: !sessionId });
  const [filterClass, setFilterClass] = useState('');

  const params = { session: sessionId };
  if (filterClass) params.classId = filterClass;

  const { data, isLoading } = useGetMarksAuditLogQuery(params, { skip: !sessionId });

  const logs = data?.data || [];
  const classes = classData?.data || [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Marks Audit Log</h1>
      <p className="text-sm text-gray-500 mb-6">Track all marks uploads — who, when, what method</p>

      <div className="flex gap-3 mb-4">
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>

      {isLoading ? <div className="text-center py-8">Loading...</div> : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date & Time</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Teacher</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Exam</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Class</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Section</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Subject</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Method</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Students</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log._id} className="border-t hover:bg-gray-50">
                    <td className="py-3 px-4 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="py-3 px-4 font-medium">{log.uploadedBy?.firstName} {log.uploadedBy?.lastName}</td>
                    <td className="py-3 px-4">{log.examId?.name} <span className="text-xs text-gray-400 capitalize">({log.examId?.type?.replace('_', ' ')})</span></td>
                    <td className="py-3 px-4">{log.classId?.name}</td>
                    <td className="py-3 px-4">{log.sectionId?.name}</td>
                    <td className="py-3 px-4">{log.subjectId?.name} <span className="text-xs text-gray-400">({log.subjectId?.code})</span></td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${log.uploadMethod === 'excel' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {log.uploadMethod === 'excel' ? '📊 Excel' : '✏️ Manual'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold">{log.studentCount}</td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan="8" className="text-center py-8 text-gray-500">No audit logs yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarksAuditLog;
