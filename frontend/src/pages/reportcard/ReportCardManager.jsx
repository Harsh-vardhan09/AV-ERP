import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useGetActiveSessionQuery, useGetClassesQuery, useGetSectionsQuery, useGetSessionsQuery, useGetExamsQuery } from '../../redux/api/adminApi';
import { useGetMyClassTeacherQuery } from '../../redux/api/teacherApi';
import { useGenerateReportCardsMutation, useGetClassReportCardsQuery } from '../../redux/api/reportCardApi';
import { canGenerateReport, getBlockReasonMessage } from '../../utils/reportCardValidation';
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
    <div className="rc-manager-page">
      <div className="rc-manager-header">
        <div>
          <h1 className="rc-title">Report Card Manager</h1>
          <p className="rc-subtitle">Generate, track, and open report cards for the selected class.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            className="rc-primary-btn"
            onClick={handleGenerate}
            disabled={!selectedClass || !selectedSession || isGenerating || !canGenerate}
            title={!canGenerate && blockReason ? blockReason : ''}
          >
            {isGenerating ? 'Generating...' : 'Generate For Class'}
          </button>
          {!canGenerate && selectedClass && blockReason && (
            <p className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded border border-amber-200">
              ⚠️ {blockReason}
            </p>
          )}
        </div>
      </div>

      <div className="rc-filter-card">
        <div className="rc-filter-grid">
          <div>
            <label className="rc-label">Session</label>
            <select
              value={selectedSession}
              onChange={(event) => {
                setSelectedSession(event.target.value);
                setSelectedClass('');
                setSelectedSection('');
              }}
              className="rc-select"
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
            <label className="rc-label">Class</label>
            <select
              value={selectedClass}
              onChange={(event) => {
                setSelectedClass(event.target.value);
                setSelectedSection('');
              }}
              className="rc-select"
            >
              <option value="">Select Class</option>
              {classes.map((item) => (
                <option key={item._id} value={item._id}>{item.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="rc-label">Section</label>
            <select
              value={selectedSection}
              onChange={(event) => setSelectedSection(event.target.value)}
              className="rc-select"
              disabled={!selectedClass}
            >
              <option value="">All Sections</option>
              {sections.map((item) => (
                <option key={item._id} value={item._id}>{item.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="rc-label">Search</label>
            <input
              type="text"
              placeholder="Search by name or roll no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rc-select"
              disabled={!selectedClass || !selectedSession}
            />
          </div>
        </div>
      </div>

      <div className="rc-stat-row">
        <div className="rc-stat-card">
          <span>Total</span>
          <strong>{rows.length}</strong>
        </div>
        <div className="rc-stat-card">
          <span>Generated</span>
          <strong>{generatedCount}</strong>
        </div>
        <div className="rc-stat-card">
          <span>Finalized</span>
          <strong>{finalizedCount}</strong>
        </div>
        <div className="rc-stat-card">
          <span>Pending</span>
          <strong>{pendingCount}</strong>
        </div>
      </div>

      <div className="rc-table-card">
        {isFetching ? (
          <div className="rc-empty">Loading report cards...</div>
        ) : rows.length === 0 ? (
          <div className="rc-empty">No students found for this selection.</div>
        ) : (
          <div className="rc-table-wrap">
            <table className="rc-manager-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student</th>
                  <th>Section</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.studentId}>
                    <td>{row.rollNo || '-'}</td>
                    <td>{row.firstName} {row.lastName}</td>
                    <td>{row.sectionName || '-'}</td>
                    <td>
                      <span className={STATUS_CLASS[row.status] || STATUS_CLASS.pending}>
                        {STATUS_LABELS[row.status] || STATUS_LABELS.pending}
                      </span>
                    </td>
                    <td>{row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '-'}</td>
                    <td>
                      <button
                        type="button"
                        className="rc-link-btn"
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
        )}
      </div>
    </div>
  );
};

export default ReportCardManager;
