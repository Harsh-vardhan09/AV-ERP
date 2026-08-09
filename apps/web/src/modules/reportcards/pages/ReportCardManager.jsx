import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useGetActiveSessionQuery, useGetClassesQuery, useGetSectionsQuery, useGetSessionsQuery, useGetExamsQuery } from '@shared/lib/api/adminApi';
import { useGetMyClassTeacherQuery } from '@modules/people/api/teacherApi';
import { useGenerateReportCardsMutation, useGetClassReportCardsQuery } from '../api/reportCardApi';
import { canGenerateReport, getBlockReasonMessage } from '@shared/utils/reportCardValidation';
import './reportCard.css';

const STATUS_LABELS = {
  pending: 'Pending',
  generated: 'Generated',
  finalized: 'Finalized',
};

const STATUS_CLASS = {
  pending: 'rc-status rc-status-pending',
  generated: 'rc-status rc-status-generated',
  finalized: 'rc-status rc-status-finalized',
};

const ReportCardManager = () => {
  const navigate = useNavigate();
  const role = useSelector((state) => state?.user?.user?.user?.role);
  const isOasesEnabled = useSelector((state) => state?.oasesSettings?.isOasesEnabled ?? false);
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';

  const { data: activeSessionData } = useGetActiveSessionQuery(undefined, { skip: !isAdmin });
  const { data: sessionsData } = useGetSessionsQuery(undefined, { skip: !isAdmin });
  const { data: classTeacherData } = useGetMyClassTeacherQuery(undefined, { skip: !isTeacher });

  const [selectedSession, setSelectedSession] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const activeSessionId = activeSessionData?.data?._id;
  const allSessions = sessionsData?.data || [];
  const classTeacherAssignments = classTeacherData?.data || [];

  useEffect(() => {
    if (isAdmin && activeSessionId && !selectedSession) {
      setSelectedSession(activeSessionId);
    }
  }, [isAdmin, activeSessionId, selectedSession]);

  useEffect(() => {
    if (!isTeacher || !classTeacherAssignments.length) {
      return;
    }

    if (!selectedSession || !selectedClass) {
      const first = classTeacherAssignments[0];
      setSelectedSession(first.session?._id || '');
      setSelectedClass(first.classId?._id || '');
      setSelectedSection(first.sectionId?._id || '');
    }
  }, [isTeacher, classTeacherAssignments, selectedSession, selectedClass]);

  const { data: classData } = useGetClassesQuery(selectedSession, {
    skip: !isAdmin || !selectedSession,
  });

  const classes = useMemo(() => {
    if (isTeacher) {
      return classTeacherAssignments
        .filter((item) => !selectedSession || item.session?._id === selectedSession)
        .reduce((acc, item) => {
          const id = item.classId?._id;
          if (!id || acc.some((entry) => entry._id === id)) {
            return acc;
          }

          acc.push({
            _id: id,
            name: item.classId?.name,
            numericOrder: item.classId?.numericOrder,
          });
          return acc;
        }, [])
        .sort((a, b) => (a.numericOrder ?? 999) - (b.numericOrder ?? 999));
    }

    return [...(classData?.data || [])].sort((a, b) => (a.numericOrder ?? 999) - (b.numericOrder ?? 999));
  }, [isTeacher, classTeacherAssignments, selectedSession, classData]);

  const { data: sectionData } = useGetSectionsQuery(
    { classId: selectedClass, session: selectedSession },
    {
      skip: !selectedClass || !selectedSession || isTeacher,
    }
  );

  const sections = useMemo(() => {
    if (isTeacher) {
      return classTeacherAssignments
        .filter(
          (item) =>
            (!selectedSession || item.session?._id === selectedSession) &&
            (!selectedClass || item.classId?._id === selectedClass)
        )
        .map((item) => ({
          _id: item.sectionId?._id,
          name: item.sectionId?.name,
        }))
        .filter((item, index, list) => item._id && list.findIndex((x) => x._id === item._id) === index)
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    }

    return [...(sectionData?.data || [])].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [isTeacher, classTeacherAssignments, selectedClass, selectedSession, sectionData]);

  useEffect(() => {
    if (isTeacher && sections.length && !sections.some((item) => item._id === selectedSection)) {
      setSelectedSection(sections[0]._id);
    }
  }, [isTeacher, sections, selectedSection]);

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      // Debounce logic handled by RTK Query's caching
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const queryArgs = selectedClass && selectedSession
    ? {
      classId: selectedClass,
      sectionId: selectedSection || undefined,
      session: selectedSession,
      ...(searchTerm && { search: searchTerm }),
    }
    : undefined;

  const { data: classReportData, isFetching } = useGetClassReportCardsQuery(queryArgs, {
    skip: !queryArgs,
  });

  const rows = classReportData?.data || [];

  const [generateReportCards, { isLoading: isGenerating }] = useGenerateReportCardsMutation();

  const { data: classExamsData } = useGetExamsQuery({ session: selectedSession, classId: selectedClass }, { skip: !selectedClass || !selectedSession });
  const classExams = classExamsData?.data || [];
  const hasExams = classExams.length > 0;

  // ── DUAL WORKFLOW VALIDATION ──
  const canGenerate = canGenerateReport({ isOasesEnabled, exams: classExams });
  const blockReason = getBlockReasonMessage({ isOasesEnabled, exams: classExams });

  const handleGenerate = async () => {
    if (!selectedClass || !selectedSession) {
      toast.error('Select session and class first');
      return;
    }

    try {
      const response = await generateReportCards({
        classId: selectedClass,
        sectionId: selectedSection || undefined,
        session: selectedSession,
      }).unwrap();

      toast.success(response?.message || 'Report cards generated');
    } catch (error) {
      toast.error(error?.data?.message || 'Unable to generate report cards');
    }
  };

  const handleOpen = (studentId) => {
    const basePath = isAdmin ? '/admin/report-cards' : '/teacher/report-cards';
    const params = new URLSearchParams();

    if (selectedSession) params.set('session', selectedSession);
    if (selectedClass) params.set('classId', selectedClass);
    if (selectedSection) params.set('sectionId', selectedSection);

    navigate(`${basePath}/${studentId}?${params.toString()}`);
  };

  const finalizedCount = rows.filter((item) => item.status === 'finalized').length;
  const generatedCount = rows.filter((item) => item.status === 'generated').length;
  const pendingCount = rows.filter((item) => item.status === 'pending').length;

  return (
    <div className="max-w-6xl mx-auto space-y-4 px-2 sm:px-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Report Cards</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage and generate student academic performance reports</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
            onClick={handleGenerate}
            disabled={!selectedClass || !selectedSession || isGenerating || !canGenerate}
            title={!canGenerate && blockReason ? blockReason : ''}
          >
            {isGenerating ? 'Generating...' : 'Generate For Class'}
          </button>
        </div>
      </div>

      {!canGenerate && selectedClass && blockReason && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800">
          {blockReason}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Session</label>
            <select
              value={selectedSession}
              onChange={(event) => {
                setSelectedSession(event.target.value);
                setSelectedClass('');
                setSelectedSection('');
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
              disabled={isTeacher && classTeacherAssignments.length <= 1}
            >
              <option value="">Select Session</option>
              {isTeacher
                ? classTeacherAssignments
                  .map((item) => ({ id: item.session?._id, name: item.session?.name }))
                  .filter((item, index, list) => item.id && list.findIndex((x) => x.id === item.id) === index)
                  .map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))
                : allSessions.map((session) => (
                  <option key={session._id} value={session._id}>{session.name}{session.isActive ? ' (Active)' : ''}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(event) => {
                setSelectedClass(event.target.value);
                setSelectedSection('');
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
            >
              <option value="">Select Class</option>
              {classes.map((item) => (
                <option key={item._id} value={item._id}>{item.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
            <select
              value={selectedSection}
              onChange={(event) => setSelectedSection(event.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
              disabled={!selectedClass}
            >
              <option value="">All Sections</option>
              {sections.map((item) => (
                <option key={item._id} value={item._id}>{item.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by name or roll no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
              disabled={!selectedClass || !selectedSession}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Total</span>
          <strong className="block text-base font-bold text-slate-900 mt-0.5 tabular-nums">{rows.length}</strong>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Generated</span>
          <strong className="block text-base font-bold text-slate-900 mt-0.5 tabular-nums">{generatedCount}</strong>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Finalized</span>
          <strong className="block text-base font-bold text-slate-900 mt-0.5 tabular-nums">{finalizedCount}</strong>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Pending</span>
          <strong className="block text-base font-bold text-slate-900 mt-0.5 tabular-nums">{pendingCount}</strong>
        </div>
      </div>

      {/* Main List Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {isFetching ? (
          <div className="flex justify-center py-14">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">No students found for this selection.</div>
        ) : (
          <>
            {/* Mobile Card View (Phones) */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {rows.map((row) => (
                <div key={row.studentId} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{row.firstName} {row.lastName}</span>
                    <span className="text-[11px] font-semibold text-slate-500">Roll: {row.rollNo || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>Sec: <strong className="text-slate-800">{row.sectionName || '-'}</strong></span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[10px] font-bold uppercase">
                        {STATUS_LABELS[row.status] || 'Pending'}
                      </span>
                      <button
                        type="button"
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => handleOpen(row.studentId)}
                      >
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-left">
                    <th className="py-2.5 px-4">Roll No</th>
                    <th className="py-2.5 px-4">Student</th>
                    <th className="py-2.5 px-4">Section</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Updated</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {rows.map((row) => (
                    <tr key={row.studentId} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-800">{row.rollNo || '-'}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{row.firstName} {row.lastName}</td>
                      <td className="py-3 px-4">{row.sectionName || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[10px] font-bold uppercase">
                          {STATUS_LABELS[row.status] || 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
                          onClick={() => handleOpen(row.studentId)}
                        >
                          Open Report Card
                        </button>
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

export default ReportCardManager;
