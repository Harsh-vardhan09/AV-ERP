import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useGetActiveSessionQuery,
  useGetClassesQuery,
  useGetSectionsQuery,
  useGetSessionsQuery,
  useGetAdminStudentsQuery,
} from '../../redux/api/adminApi';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import './documents.css';

const DocumentStudentList = ({ documentType, basePath }) => {
  const { data: activeSessionData } = useGetActiveSessionQuery();
  const { data: sessionsData } = useGetSessionsQuery();
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const activeSessionId = activeSessionData?.data?._id;
  const allSessions = sessionsData?.data || [];

  useEffect(() => {
    if (activeSessionId && !selectedSession) setSelectedSession(activeSessionId);
  }, [activeSessionId, selectedSession]);

  const { data: classData } = useGetClassesQuery(selectedSession, { skip: !selectedSession });
  const classes = useMemo(
    () => [...(classData?.data || [])].sort((a, b) => (a.numericOrder ?? 999) - (b.numericOrder ?? 999)),
    [classData]
  );

  const { data: sectionData } = useGetSectionsQuery(
    { classId: selectedClass, session: selectedSession },
    { skip: !selectedClass || !selectedSession }
  );
  const sections = sectionData?.data || [];

  const q = {};
  if (selectedSession) q.session = selectedSession;
  if (selectedClass) q.classId = selectedClass;
  if (selectedSection) q.sectionId = selectedSection;

  const { data: studentsRes, isLoading } = useGetAdminStudentsQuery(q, { skip: !selectedSession });

  const students = studentsRes?.data || [];
  const title = documentType === 'TC' ? 'Transfer Certificate (TC)' : 'Migration Certificate';

  return (
    <div className="max-w-6xl mx-auto space-y-4 px-2 sm:px-4 pb-12">
      
      {/* Header */}
      <div className="pt-1 space-y-2">
        <Link
          to="/admin/documents"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Documents</span>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Select a student record to issue or update certificate data</p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Academic Session</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
            value={selectedSession}
            onChange={(e) => {
              setSelectedSession(e.target.value);
              setSelectedClass('');
              setSelectedSection('');
            }}
          >
            <option value="">Select session</option>
            {allSessions.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Class</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400 disabled:opacity-50"
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedSection('');
            }}
            disabled={!selectedSession}
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Section</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400 disabled:opacity-50"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={!selectedClass}
          >
            <option value="">All sections</option>
            {sections.map((sec) => (
              <option key={sec._id} value={sec._id}>
                {sec.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="flex justify-center py-14">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">No students found for this filter</div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {students.map((s) => (
                <div key={s._id} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{s.firstName} {s.lastName}</span>
                    <span className="text-[11px] font-semibold text-slate-500">Roll: {s.rollNo || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>Class: <strong className="text-slate-800">{s.classId?.name || '—'}</strong></span>
                    <Link
                      to={`${basePath}/${s._id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                    >
                      <span>Open Form</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-slate-500 font-semibold">
                    <th className="py-2.5 px-4 font-semibold">Roll No</th>
                    <th className="py-2.5 px-4 font-semibold">Student Name</th>
                    <th className="py-2.5 px-4 font-semibold">Class</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {students.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-500">{s.rollNo || '—'}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {s.firstName} {s.lastName}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{s.classId?.name || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`${basePath}/${s._id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                        >
                          <span>Open Form</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default DocumentStudentList;
