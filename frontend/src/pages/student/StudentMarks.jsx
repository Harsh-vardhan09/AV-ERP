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
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 pb-10">
      
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Marks & Results</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">View your academic performance reports and exam results</p>
      </div>

      {studentName && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-slate-500">
          <div>Student Name: <span className="font-bold text-slate-800">{studentName}</span></div>
          <div className="hidden sm:block text-slate-300">•</div>
          <div>Roll No: <span className="font-bold text-slate-800 tabular-nums">{rollNo}</span></div>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {Object.values(grouped).map((group, i) => {
        const percentage = group.totalMax > 0 ? ((group.totalObtained / group.totalMax) * 100).toFixed(1) : 0;
        return (
          <div key={i} className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden mb-6">
            
            {/* Exam Header Summary */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {group.exam?.name}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {group.exam?.type?.replace('_', ' ') || 'Exam'}
                  </span>
                </div>
                {group.exam?.startDate && (
                  <p className="text-xs text-slate-400 mt-1 tabular-nums">
                    {new Date(group.exam.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(group.exam.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
              <div className="text-left sm:text-right shrink-0">
                <span className="text-xl sm:text-2xl font-extrabold text-indigo-600 block tracking-tight tabular-nums">
                  {percentage}%
                </span>
                <span className="text-xs font-bold text-slate-400 mt-0.5 block tabular-nums">
                  {group.totalObtained} / {group.totalMax} Marks
                </span>
              </div>
            </div>

            {/* Subjects Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/30 text-left text-xs text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-5">Subject</th>
                    <th className="py-3.5 px-5 hidden md:table-cell">Teacher</th>
                    <th className="py-3.5 px-5 text-center">Marks</th>
                    <th className="py-3.5 px-5 text-center">Max Marks</th>
                    <th className="py-3.5 px-5 text-center">Status</th>
                    <th className="py-3.5 px-5 hidden sm:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {group.subjects.map((m, j) => {
                    const passed = m.passingMarks ? m.marksObtained >= m.passingMarks : true;
                    return (
                      <tr key={j} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-5">
                          <span className="font-semibold text-slate-800 block">
                            {m.subjectId?.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mt-0.5">
                            {m.subjectId?.code || '—'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-slate-500 text-xs hidden md:table-cell">
                          {m.uploadedBy?.firstName} {m.uploadedBy?.lastName}
                        </td>
                        <td className="py-3.5 px-5 text-center font-bold text-slate-900 text-base tabular-nums">
                          {m.marksObtained}
                        </td>
                        <td className="py-3.5 px-5 text-center text-slate-400 tabular-nums">
                          {m.maxMarks || '—'}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            passed 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {passed ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-slate-400 text-xs hidden sm:table-cell tabular-nums">
                          {m.updatedAt ? new Date(m.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {marks.length === 0 && !isLoading && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm font-medium">No marks available yet.</p>
        </div>
      )}
    </div>
  );
};

export default StudentMarks;
