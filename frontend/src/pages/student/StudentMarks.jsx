import React from 'react';
import { useGetMyStudentMarksQuery } from '../../redux/api/studentApi';

const StudentMarks = () => {
  const { data, isLoading } = useGetMyStudentMarksQuery();
  const marks = data?.data || [];
  const studentName = marks[0]?.studentName || '';
  const rollNo = marks[0]?.rollNo || '';

  // Group by exam
  const grouped = marks.reduce((acc, m) => {
    const key = m.examId?._id || 'unknown';
    if (!acc[key]) acc[key] = { exam: m.examId, subjects: [], totalObtained: 0, totalMax: 0 };
    acc[key].subjects.push(m);
    acc[key].totalObtained += m.marksObtained || 0;
    acc[key].totalMax += m.maxMarks || 0;
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Marks & Results</h1>
      {studentName && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 mb-6 border">
          <div className="flex gap-6 text-sm">
            <div><span className="text-gray-500">Name:</span> <span className="font-semibold text-gray-800">{studentName}</span></div>
            <div><span className="text-gray-500">Roll No:</span> <span className="font-semibold text-gray-800">{rollNo}</span></div>
          </div>
        </div>
      )}

      {isLoading && <div className="text-center py-8">Loading...</div>}

      {Object.values(grouped).map((group, i) => {
        const percentage = group.totalMax > 0 ? ((group.totalObtained / group.totalMax) * 100).toFixed(1) : 0;
        return (
          <div key={i} className="bg-white rounded-xl shadow-sm border mb-6 overflow-hidden">
            <div className="px-5 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-gray-800">{group.exam?.name}
                  <span className="ml-2 text-sm text-gray-500 capitalize">({group.exam?.type?.replace('_', ' ')})</span>
                </h3>
                {group.exam?.startDate && (
                  <p className="text-xs text-gray-400">{new Date(group.exam.startDate).toLocaleDateString()} - {new Date(group.exam.endDate).toLocaleDateString()}</p>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-indigo-600">{percentage}%</div>
                <div className="text-xs text-gray-500">{group.totalObtained}/{group.totalMax}</div>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Subject</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Teacher</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Marks</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Max</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {group.subjects.map((m, j) => {
                  const passed = m.passingMarks ? m.marksObtained >= m.passingMarks : true;
                  return (
                    <tr key={j} className="border-t hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{m.subjectId?.name} <span className="text-xs text-gray-400">({m.subjectId?.code})</span></td>
                      <td className="py-3 px-4 text-gray-600">{m.uploadedBy?.firstName} {m.uploadedBy?.lastName}</td>
                      <td className="py-3 px-4 font-bold text-lg">{m.marksObtained}</td>
                      <td className="py-3 px-4 text-gray-500">{m.maxMarks || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {passed ? 'Pass' : 'Fail'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400">{m.updatedAt ? new Date(m.updatedAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
      {marks.length === 0 && !isLoading && <div className="text-center py-12 text-gray-500">No marks available yet</div>}
    </div>
  );
};

export default StudentMarks;
