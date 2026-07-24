import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetMyAssignmentsQuery,
  useGetMyClassTeacherQuery,
  useGetMyLeavesQuery,
  useGetStudentsForAttendanceQuery,
} from '../../redux/api/teacherApi';
import { useGetActiveSessionQuery } from '../../redux/api/adminApi';
import { MdSubject, MdClass, MdPeople, MdDescription, MdChevronRight } from 'react-icons/md';
import { FaChalkboardTeacher } from 'react-icons/fa';

const TeacherDashboard = () => {
  const { data: sessionData } = useGetActiveSessionQuery();
  const activeSessionId = sessionData?.data?._id;

  const { data: assignData } = useGetMyAssignmentsQuery();
  const { data: ctData } = useGetMyClassTeacherQuery();
  const { data: leaveData } = useGetMyLeavesQuery();

  const assignments = assignData?.data || [];
  const classTeacher = ctData?.data || [];
  const leaves = leaveData?.data || [];
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const isClassTeacher = classTeacher.length > 0;

  // For viewing class students — ONLY for class teachers
  const [selectedCT, setSelectedCT] = useState(null);

  const { data: studentsData, isFetching: loadingStudents } = useGetStudentsForAttendanceQuery(
    { classId: selectedCT?.classId, sectionId: selectedCT?.sectionId, session: activeSessionId },
    { skip: !selectedCT || !activeSessionId || !isClassTeacher }
  );
  const classStudents = studentsData?.data || [];

  // Derive unique subjects
  const uniqueSubjects = [...new Map(
    assignments.filter(a => a.subjectId).map(a => [a.subjectId._id, a.subjectId])
  ).values()];

  // Group by class-section for "What I teach where"
  const teachingMap = {};
  assignments.forEach(a => {
    const key = `${a.classId?._id}_${a.sectionId?._id}`;
    if (!teachingMap[key]) {
      teachingMap[key] = {
        classId: a.classId?._id,
        sectionId: a.sectionId?._id,
        className: a.classId?.name,
        sectionName: a.sectionId?.name,
        subjects: []
      };
    }
    if (a.subjectId) teachingMap[key].subjects.push(a.subjectId.name);
  });
  const teachingSlots = Object.values(teachingMap);

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-5">My Dashboard</h1>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Subjects', value: uniqueSubjects.length, icon: <MdSubject size={22} />, color: 'bg-blue-100 text-blue-600' },
          { label: 'Class-Sections', value: teachingSlots.length, icon: <MdClass size={22} />, color: 'bg-purple-100 text-purple-600' },
          ...(isClassTeacher ? [{ label: 'Class Teacher Of', value: classTeacher.length, icon: <FaChalkboardTeacher size={22} />, color: 'bg-emerald-100 text-emerald-600' }] : []),
          { label: 'Pending Leaves', value: pendingLeaves, icon: <MdDescription size={22} />, color: 'bg-amber-100 text-amber-600' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg shrink-0 ${color}`}>{icon}</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={`grid grid-cols-1 ${isClassTeacher ? 'lg:grid-cols-2' : ''} gap-5 mb-5`}>
        {/* ── My Class (Class Teacher only) ── */}
        {isClassTeacher && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <FaChalkboardTeacher className="text-emerald-600" />
              <h2 className="text-sm font-semibold text-gray-700">My Class (Class Teacher)</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {classTeacher.map((ct) => (
                <button
                  key={ct._id}
                  onClick={() => setSelectedCT(selectedCT?.classId === ct.classId?._id && selectedCT?.sectionId === ct.sectionId?._id
                    ? null
                    : { classId: ct.classId?._id, sectionId: ct.sectionId?._id, name: `${ct.classId?.name} - ${ct.sectionId?.name}` }
                  )}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition">
                  <div>
                    <p className="font-medium text-sm text-gray-900">Class {ct.classId?.name} — Section {ct.sectionId?.name}</p>
                    <p className="text-xs text-gray-400">Session: {ct.session?.name}</p>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${selectedCT?.classId === ct.classId?._id ? 'bg-emerald-100 text-emerald-700' : 'text-blue-600'}`}>
                    {selectedCT?.classId === ct.classId?._id ? 'Hide' : 'View Students'} <MdChevronRight />
                  </span>
                </button>
              ))}
            </div>

            {/* Inline student list */}
            {selectedCT && (
              <div className="border-t border-gray-100">
                <div className="px-4 py-2 bg-emerald-50 flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-700">Students of {selectedCT.name}</span>
                  {loadingStudents && <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
                </div>
                {classStudents.length === 0 && !loadingStudents ? (
                  <p className="text-center text-xs text-gray-400 py-4">No students found.</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
                    {classStudents.map((s) => (
                      <div key={s._id} className="flex items-center gap-3 px-4 py-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {s.firstName?.[0]}{s.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{s.firstName} {s.lastName}</p>
                          <p className="text-xs text-gray-400">Roll: {s.rollNo || '—'}</p>
                        </div>
                        {s.onLeave && (
                          <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">🏖 On Leave</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── My Subjects ── */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <MdSubject className="text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-700">My Subjects</h2>
          </div>
          {uniqueSubjects.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No subjects assigned.</p>
          ) : (
            <div className="px-4 py-3 flex flex-wrap gap-2">
              {uniqueSubjects.map(s => (
                <span key={s._id} className="bg-blue-50 text-blue-700 border border-blue-100 text-xs px-3 py-1.5 rounded-full font-medium">
                  {s.name} <span className="text-blue-400">({s.code})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── What I Teach Where ── */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-5">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <MdPeople className="text-purple-600" />
          <h2 className="text-sm font-semibold text-gray-700">Where I Teach</h2>
        </div>
        {teachingSlots.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">No teaching assignments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium uppercase tracking-wider">Class</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium uppercase tracking-wider">Section</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium uppercase tracking-wider">Subjects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teachingSlots.map((slot, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{slot.className}</td>
                    <td className="px-4 py-3 text-gray-600">{slot.sectionName}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {slot.subjects.map((s, j) => (
                          <span key={j} className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded font-medium border border-purple-100">{s}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
