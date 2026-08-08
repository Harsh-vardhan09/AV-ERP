import React, { useState, useMemo } from 'react';
import {
  useGetMyClassStudentsQuery,
  useGetStudentPerformanceQuery,
} from '@modules/people/api/teacherApi';
import { MdPeople, MdSearch, MdClose } from 'react-icons/md';
import { FaChalkboardTeacher } from 'react-icons/fa';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Attendance progress bar ───────────────────────────────────────
const PctBar = ({ pct, color = 'bg-green-500' }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct ?? 0}%` }} />
    </div>
    <span className="text-xs font-semibold text-gray-700 w-10 text-right">{pct !== null ? `${pct}%` : '—'}</span>
  </div>
);

// ─── Status chip ───────────────────────────────────────────────────
const Chip = ({ label, color }) => (
  <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{label}</span>
);

const statusColor = (s) => ({
  present: 'bg-green-50 text-green-700 border border-green-200',
  absent:  'bg-red-50  text-red-700  border border-red-200',
  late:    'bg-amber-50 text-amber-700 border border-amber-200',
  leave:   'bg-blue-50  text-blue-700  border border-blue-200',
}[s] || 'bg-gray-50 text-gray-600');

// ─── Performance modal ─────────────────────────────────────────────
const PerformanceModal = ({ student, classInfo, onClose }) => {
  const { data, isLoading } = useGetStudentPerformanceQuery({
    studentId: student._id,
    classId:   classInfo.classId,
    sectionId: classInfo.sectionId,
    sessionId: classInfo.sessionId,
    session:   classInfo.sessionId,
  }, { skip: !student });

  const att = data?.attendance;
  const asgn = data?.assignments;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              {student.firstName?.[0]}{student.lastName?.[0]}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{student.firstName} {student.lastName}</h2>
              <p className="text-xs text-gray-400">Roll: {student.rollNo || '—'} · Scholar: {student.scholarNo || '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><MdClose size={22} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ── Attendance Summary ── */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Attendance Summary</h3>
                {att ? (
                  <>
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">Overall Attendance</span>
                        <span className={`text-sm font-bold ${att.percentage >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                          {att.percentage !== null ? `${att.percentage}%` : '—'}
                        </span>
                      </div>
                      <PctBar
                        pct={att.percentage}
                        color={att.percentage >= 75 ? 'bg-green-500' : att.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[
                        { label: 'Present', val: att.present, cls: 'bg-green-50 text-green-700' },
                        { label: 'Absent',  val: att.absent,  cls: 'bg-red-50 text-red-700' },
                        { label: 'Late',    val: att.late,    cls: 'bg-amber-50 text-amber-700' },
                        { label: 'Leave',   val: att.leave,   cls: 'bg-blue-50 text-blue-700' },
                      ].map(({ label, val, cls }) => (
                        <div key={label} className={`rounded-lg p-2 text-center ${cls}`}>
                          <p className="text-lg font-bold">{val}</p>
                          <p className="text-xs opacity-80">{label}</p>
                        </div>
                      ))}
                    </div>
                    {att.recent?.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1.5">Recent ({att.recent.length})</p>
                        <div className="flex flex-wrap gap-1.5">
                          {att.recent.map((r, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <Chip label={fmtDate(r.date)} color={statusColor(r.status)} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {att.total === 0 && <p className="text-sm text-gray-400 text-center py-2">No attendance records found.</p>}
                  </>
                ) : <p className="text-sm text-gray-400 text-center py-2">No attendance data.</p>}
              </div>

              {/* ── Assignments Summary ── */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Assignment Summary</h3>
                {asgn ? (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { label: 'Total',     val: asgn.total,     cls: 'bg-gray-100 text-gray-700' },
                        { label: 'Submitted', val: asgn.submitted, cls: 'bg-green-50 text-green-700' },
                        { label: 'Pending',   val: asgn.pending,   cls: 'bg-red-50 text-red-700' },
                      ].map(({ label, val, cls }) => (
                        <div key={label} className={`rounded-lg p-2 text-center ${cls}`}>
                          <p className="text-lg font-bold">{val}</p>
                          <p className="text-xs opacity-80">{label}</p>
                        </div>
                      ))}
                    </div>
                    {asgn.total > 0 && (
                      <>
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Submission Rate</span>
                            <span>{asgn.total ? Math.round((asgn.submitted / asgn.total) * 100) : 0}%</span>
                          </div>
                          <PctBar pct={asgn.total ? Math.round((asgn.submitted / asgn.total) * 100) : 0} color="bg-indigo-500" />
                        </div>
                        <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto rounded-lg border border-gray-100">
                          {asgn.details.map((a, i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-2 bg-white">
                              <div>
                                <p className="text-sm font-medium text-gray-800">{a.title}</p>
                                <p className="text-xs text-gray-400">{a.subject} · Due: {fmtDate(a.dueDate)}</p>
                              </div>
                              <Chip
                                label={a.submitted ? '✓ Submitted' : '✗ Pending'}
                                color={a.submitted ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}
                              />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {asgn.total === 0 && <p className="text-sm text-gray-400 text-center py-2">No assignments for this class yet.</p>}
                  </>
                ) : <p className="text-sm text-gray-400 text-center py-2">No assignment data.</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────
const TeacherMyStudents = () => {
  const [selectedSlot, setSelectedSlot]   = useState(null); // { classId, sectionId, session }
  const [search, setSearch]               = useState('');
  const [viewStudent, setViewStudent]     = useState(null);

  const params = selectedSlot || {};
  const { data, isLoading, isError } = useGetMyClassStudentsQuery(params);

  const students    = data?.data || [];
  const classInfo   = data?.classInfo;
  const assignments = data?.assignments || []; // all CT assignments for dropdowns

  // Auto-set selected slot from API classInfo on first load
  const currentSlot = selectedSlot || (classInfo ? {
    classId: classInfo.classId, sectionId: classInfo.sectionId, session: classInfo.sessionId,
  } : null);

  // Derived unique filter options
  const sessionOptions = useMemo(() => {
    const seen = new Set();
    return assignments.filter(a => {
      if (seen.has(a.sessionId)) return false;
      seen.add(a.sessionId); return true;
    });
  }, [assignments]);

  const filteredStudents = useMemo(() =>
    students.filter(s => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        (s.rollNo && String(s.rollNo).includes(q)) ||
        (s.scholarNo && String(s.scholarNo).toLowerCase().includes(q)) ||
        (s.admissionNumber && String(s.admissionNumber).toLowerCase().includes(q))
      );
    }), [students, search]);

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (isError) return (
    <div className="text-center py-20 text-gray-400">
      <FaChalkboardTeacher size={48} className="mx-auto mb-2 opacity-20" />
      <p className="text-base font-medium text-gray-500">You are not assigned as a class teacher.</p>
    </div>
  );

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My Students</h1>
          {classInfo && (
            <p className="text-sm text-gray-500 mt-0.5">
              Class <span className="font-medium text-emerald-700">{classInfo.class}</span>
              {' — '}Section <span className="font-medium text-emerald-700">{classInfo.section}</span>
              {' · '}{classInfo.session}
            </p>
          )}
        </div>
        <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-semibold shrink-0">
          {filteredStudents.length} Students
        </span>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-end">
        {/* Class + Section selector */}
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Class — Section</label>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-400 outline-none min-w-[160px]"
            value={currentSlot ? `${currentSlot.classId}__${currentSlot.sectionId}` : ''}
            onChange={e => {
              const [classId, sectionId] = e.target.value.split('__');
              // find matching session from assignments
              const match = assignments.find(a => a.classId?.toString() === classId && a.sectionId?.toString() === sectionId);
              if (match) setSelectedSlot({ classId: match.classId, sectionId: match.sectionId, session: match.sessionId });
            }}
          >
            {assignments.map((a, i) => (
              <option key={i} value={`${a.classId}__${a.sectionId}`}>
                Class {a.className} — {a.sectionName}
              </option>
            ))}
          </select>
        </div>

        {/* Session selector (across all slots) */}
        {sessionOptions.length > 1 && (
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Session</label>
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-400 outline-none min-w-[140px]"
              value={currentSlot?.session || ''}
              onChange={e => setSelectedSlot(s => ({ ...s, session: e.target.value }))}
            >
              {sessionOptions.map(o => (
                <option key={o.sessionId} value={o.sessionId}>{o.sessionName}</option>
              ))}
            </select>
          </div>
        )}

        {/* Search */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Search</label>
          <div className="relative">
            <MdSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Name, roll no, scholar no…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── Desktop Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">#</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Student</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Roll</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Scholar No</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredStudents.map((s, i) => (
              <tr key={s._id} className="hover:bg-emerald-50/30 transition-colors">
                <td className="py-3 px-4 text-gray-400 text-xs">{i + 1}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">
                      {s.firstName?.[0]}{s.lastName?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{s.firstName} {s.middleName || ''} {s.lastName}</p>
                      <p className="text-xs text-gray-400">{s.userId?.email || ''}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-600">{s.rollNo || '—'}</td>
                <td className="py-3 px-4 text-gray-600">{s.scholarNo || '—'}</td>
                <td className="py-3 px-4 text-gray-600">{s.phone || '—'}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {s.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => setViewStudent(s)}
                    className="text-xs font-medium text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition"
                  >
                    View Performance
                  </button>
                </td>
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr><td colSpan="7" className="text-center py-10 text-gray-400">No students match your filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile Cards ── */}
      <div className="md:hidden space-y-3">
        {filteredStudents.map(s => (
          <div key={s._id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-base font-bold shrink-0">
              {s.firstName?.[0]}{s.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{s.firstName} {s.lastName}</p>
              <p className="text-xs text-gray-500 mt-0.5">Roll: {s.rollNo || '—'} · Scholar: {s.scholarNo || '—'}</p>
              <button
                onClick={() => setViewStudent(s)}
                className="mt-2 text-xs font-medium text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-50"
              >
                View Performance
              </button>
            </div>
            <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${s.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {s.status}
            </span>
          </div>
        ))}
        {filteredStudents.length === 0 && <p className="text-center py-8 text-gray-400">No students found.</p>}
      </div>

      {/* ── Performance Modal ── */}
      {viewStudent && classInfo && (
        <PerformanceModal
          student={viewStudent}
          classInfo={classInfo}
          onClose={() => setViewStudent(null)}
        />
      )}
    </div>
  );
};

export default TeacherMyStudents;
