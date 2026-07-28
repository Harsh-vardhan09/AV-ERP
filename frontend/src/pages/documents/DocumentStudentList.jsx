import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useGetActiveSessionQuery,
  useGetClassesQuery,
  useGetSectionsQuery,
  useGetSessionsQuery,
  useGetAdminStudentsQuery,
} from '../../redux/api/adminApi';
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
  const title = documentType === 'TC' ? 'Transfer Certificate' : 'Migration Certificate';

  return (
    <div className="doc-page-wrap">
      <div className="doc-no-print flex flex-wrap items-center gap-3 mb-4">
        <Link to="/admin/documents" className="text-sm font-semibold text-[#1a3c6e]">
          ← Documents
        </Link>
      </div>
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="text-sm text-slate-500 mt-1">Choose session, class, and section, then open a student record.</p>

      <div className="doc-list-filters doc-no-print">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Session</label>
          <select
            className="w-full border border-slate-300 rounded-md px-2 py-2 text-sm"
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
          <label className="block text-xs font-bold text-slate-700 mb-1">Class</label>
          <select
            className="w-full border border-slate-300 rounded-md px-2 py-2 text-sm"
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
          <label className="block text-xs font-bold text-slate-700 mb-1">Section</label>
          <select
            className="w-full border border-slate-300 rounded-md px-2 py-2 text-sm"
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

      <div className="doc-list-table-wrap doc-no-print">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading students…</div>
        ) : (
          <table className="doc-list-table">
            <thead>
              <tr>
                <th>Roll</th>
                <th>Name</th>
                <th>Class</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s._id}>
                  <td>{s.rollNo || '—'}</td>
                  <td>
                    {s.firstName} {s.lastName}
                  </td>
                  <td>{s.classId?.name || '—'}</td>
                  <td>
                    <Link to={`${basePath}/${s._id}`}>Open dynamic form</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!isLoading && students.length === 0 && (
          <div className="p-6 text-center text-slate-500 text-sm">No students for this filter.</div>
        )}
      </div>
    </div>
  );
};

export default DocumentStudentList;
