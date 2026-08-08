import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  useGetActiveSessionQuery,
  useGetClassesQuery,
  useGetSectionsQuery,
  useGetSessionsQuery,
} from '@shared/lib/api/adminApi';
import { useGetMyClassTeacherQuery } from '@modules/people/api/teacherApi';
import { useGetClassReportCardsQuery } from '../api/reportCardApi';
import {
  useGenerateDynamicReportMutation,
  useGenerateBulkDynamicReportsMutation,
  useGetDynamicReportsQuery,
  useGetDynamicReportStatsQuery,
  useDeleteDynamicReportMutation,
} from '../api/dynamicReportApi';
import { useGetReportTemplatesQuery } from '../api/reportTemplateApi';
import './reportCard.css';

const DynamicReportManager = () => {
  const role = useSelector((state) => state?.user?.user?.user?.role);
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';

  // State
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [examType, setExamType] = useState('annual');
  const [academicYear, setAcademicYear] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [generatingFor, setGeneratingFor] = useState(null);

  // API queries
  const { data: activeSessionData } = useGetActiveSessionQuery(undefined, { skip: !isAdmin });
  const { data: sessionsData } = useGetSessionsQuery(undefined, { skip: !isAdmin });
  const { data: classTeacherData } = useGetMyClassTeacherQuery(undefined, { skip: !isTeacher });

  const { data: templatesData } = useGetReportTemplatesQuery({
    isActive: true,
    templateType: examType,
  });

  const { data: classData } = useGetClassesQuery(selectedSession, {
    skip: !isAdmin || !selectedSession,
  });

  const { data: sectionData } = useGetSectionsQuery(
    { classId: selectedClass, session: selectedSession },
    { skip: !selectedClass || !selectedSession || isTeacher }
  );

  const { data: reportCardsData, refetch: refetchReportCards } = useGetClassReportCardsQuery(
    { classId: selectedClass, sectionId: selectedSection, session: selectedSession, search: searchTerm },
    { skip: !selectedClass || !selectedSession }
  );

  const { data: dynamicReportsData, refetch: refetchDynamicReports } = useGetDynamicReportsQuery({
    academicYear,
  }, { skip: !academicYear });

  const { data: statsData } = useGetDynamicReportStatsQuery();

  // Mutations
  const [generateReport, { isLoading: isGenerating }] = useGenerateDynamicReportMutation();
  const [generateBulk, { isLoading: isGeneratingBulk }] = useGenerateBulkDynamicReportsMutation();
  const [deleteReport, { isLoading: isDeleting }] = useDeleteDynamicReportMutation();

  // Derived data
  const activeSessionId = activeSessionData?.data?._id;
  const allSessions = sessionsData?.data || [];
  const classTeacherAssignments = classTeacherData?.data || [];
  const templates = templatesData?.data || [];
  const students = reportCardsData?.data || [];
  const dynamicReports = dynamicReportsData?.data || [];
  const stats = statsData?.data;

  // Initialize selections
  useEffect(() => {
    if (isAdmin && activeSessionId && !selectedSession) {
      setSelectedSession(activeSessionId);
      const session = allSessions.find(s => s._id === activeSessionId);
      if (session) {
        setAcademicYear(session.year || session.name);
      }
    }
  }, [isAdmin, activeSessionId, selectedSession, allSessions]);

  useEffect(() => {
    if (isTeacher && classTeacherAssignments.length > 0) {
      const first = classTeacherAssignments[0];
      setSelectedSession(first.session?._id || '');
      setSelectedClass(first.classId?._id || '');
      setSelectedSection(first.sectionId?._id || '');
      setAcademicYear(first.session?.year || first.session?.name || '');
    }
  }, [isTeacher, classTeacherAssignments]);

  // Update academic year when session changes
  useEffect(() => {
    if (selectedSession) {
      const session = allSessions.find(s => s._id === selectedSession);
      if (session) {
        setAcademicYear(session.year || session.name);
      }
    }
  }, [selectedSession, allSessions]);

  // Set default template
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      const defaultTemplate = templates.find(t => t.isDefault);
      setSelectedTemplate(defaultTemplate?._id || templates[0]._id);
    }
  }, [templates, selectedTemplate]);

  const classes = useMemo(() => {
    if (isTeacher) {
      return classTeacherAssignments
        .filter((item) => !selectedSession || item.session?._id === selectedSession)
        .reduce((acc, item) => {
          const id = item.classId?._id;
          if (!id || acc.some((entry) => entry._id === id)) return acc;
          acc.push({ _id: id, name: item.classId?.name, numericOrder: item.classId?.numericOrder });
          return acc;
        }, [])
        .sort((a, b) => (a.numericOrder ?? 999) - (b.numericOrder ?? 999));
    }
    return [...(classData?.data || [])].sort((a, b) => (a.numericOrder ?? 999) - (b.numericOrder ?? 999));
  }, [isTeacher, classTeacherAssignments, selectedSession, classData]);

  const sections = useMemo(() => {
    if (isTeacher) {
      return classTeacherAssignments
        .filter((item) => item.classId?._id === selectedClass)
        .map((item) => item.sectionId)
        .filter(Boolean);
    }
    return sectionData?.data || [];
  }, [isTeacher, classTeacherAssignments, selectedClass, sectionData]);

  const handleGenerateSingle = async (studentId) => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    setGeneratingFor(studentId);

    try {
      const result = await generateReport({
        studentId,
        templateId: selectedTemplate,
        academicYear,
        examType,
      }).unwrap();

      if (result.success) {
        toast.success('Report generated successfully!');
        if (result.data?.missingFields?.length > 0) {
          toast.warning(`${result.data.missingFields.length} fields were missing and replaced with "N/A"`);
        }
        refetchDynamicReports();
      } else {
        toast.error(result.message || 'Failed to generate report');
      }
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to generate report');
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleGenerateBulk = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    try {
      const result = await generateBulk({
        studentIds: selectedStudents,
        templateId: selectedTemplate,
        academicYear,
        examType,
      }).unwrap();

      if (result.success) {
        toast.success(`Generated ${result.data?.successful || 0} reports`);
        if (result.data?.failed > 0) {
          toast.error(`${result.data.failed} reports failed`);
        }
        refetchDynamicReports();
        setSelectedStudents([]);
      } else {
        toast.error(result.message || 'Failed to generate reports');
      }
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to generate reports');
    }
  };

  const handleDelete = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      await deleteReport(reportId).unwrap();
      toast.success('Report deleted successfully');
      refetchDynamicReports();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to delete report');
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    const allIds = students.map(s => s.studentId);
    setSelectedStudents(prev =>
      prev.length === allIds.length ? [] : allIds
    );
  };

  const getGeneratedReport = (studentId) => {
    return dynamicReports.find(r => r.studentId === studentId);
  };

  return (
    <div className="rc-container">
      <div className="rc-header">
        <h1 className="rc-title">Dynamic Report Cards</h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="rc-stats-grid" style={{ marginBottom: '24px' }}>
          <div className="rc-stat-card">
            <div className="rc-stat-value">{stats.overall?.totalReports || 0}</div>
            <div className="rc-stat-label">Total Reports</div>
          </div>
          <div className="rc-stat-card">
            <div className="rc-stat-value">{stats.overall?.totalDownloads || 0}</div>
            <div className="rc-stat-label">Total Downloads</div>
          </div>
          <div className="rc-stat-card">
            <div className="rc-stat-value">
              {stats.overall?.avgGenerationTime
                ? `${Math.round(stats.overall.avgGenerationTime)}ms`
                : 'N/A'}
            </div>
            <div className="rc-stat-label">Avg Generation Time</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rc-filters" style={{ marginBottom: '24px' }}>
        <div className="rc-filter-row" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* Session */}
          {isAdmin && (
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="rc-select"
            >
              <option value="">Select Session</option>
              {allSessions.map((session) => (
                <option key={session._id} value={session._id}>
                  {session.name}
                </option>
              ))}
            </select>
          )}

          {/* Class */}
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedSection('');
              setSelectedStudents([]);
            }}
            className="rc-select"
            disabled={!selectedSession && isAdmin}
          >
            <option value="">Select Class</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name}
              </option>
            ))}
          </select>

          {/* Section */}
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="rc-select"
            disabled={!selectedClass || sections.length === 0}
          >
            <option value="">{sections.length > 0 ? 'All Sections' : 'No Sections'}</option>
            {sections.map((section) => (
              <option key={section._id} value={section._id}>
                {section.name}
              </option>
            ))}
          </select>

          {/* Exam Type */}
          <select
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            className="rc-select"
          >
            <option value="annual">Annual</option>
            <option value="half_yearly">Half Yearly</option>
            <option value="term1">Term 1</option>
            <option value="term2">Term 2</option>
            <option value="custom">Custom</option>
          </select>

          {/* Template */}
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="rc-select"
          >
            <option value="">Select Template</option>
            {templates.map((template) => (
              <option key={template._id} value={template._id}>
                {template.name} {template.isDefault ? '(Default)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="rc-filter-row" style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rc-input"
            style={{ flex: 1 }}
          />
          <button className="rc-btn rc-btn-secondary" onClick={() => refetchReportCards()}>
            Refresh
          </button>
          {selectedStudents.length > 0 && (
            <button
              className="rc-btn rc-btn-primary"
              onClick={handleGenerateBulk}
              disabled={isGeneratingBulk}
            >
              {isGeneratingBulk ? 'Generating...' : `Generate ${selectedStudents.length} Reports`}
            </button>
          )}
        </div>
      </div>

      {/* Students Table */}
      {selectedClass && (
        <>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>
              Students ({students.length})
            </h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedStudents.length === students.length && students.length > 0}
                  onChange={selectAllStudents}
                />
                Select All
              </label>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="rc-empty">No students found</div>
          ) : (
            <table className="rc-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedStudents.length === students.length && students.length > 0}
                      onChange={selectAllStudents}
                    />
                  </th>
                  <th>Roll No</th>
                  <th>Name</th>
                  <th>Admission No</th>
                  <th>Status</th>
                  <th>Dynamic Report</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const isSelected = selectedStudents.includes(student.studentId);
                  const generatedReport = getGeneratedReport(student.studentId);
                  const isGeneratingThis = generatingFor === student.studentId;

                  return (
                    <tr key={student.studentId}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStudentSelection(student.studentId)}
                        />
                      </td>
                      <td>{student.rollNo || 'N/A'}</td>
                      <td>
                        {student.firstName} {student.lastName}
                      </td>
                      <td>{student.admissionNumber || 'N/A'}</td>
                      <td>
                        <span className={`rc-badge rc-badge-${student.status}`}>
                          {student.status}
                        </span>
                      </td>
                      <td>
                        {generatedReport ? (
                          <span className="rc-badge rc-badge-success">
                            Generated
                          </span>
                        ) : (
                          <span className="rc-badge rc-badge-pending">
                            Not Generated
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {generatedReport ? (
                            <>
                              <a
                                href={generatedReport.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rc-btn rc-btn-sm rc-btn-secondary"
                              >
                                Download
                              </a>
                              <button
                                className="rc-btn rc-btn-sm rc-btn-danger"
                                onClick={() => handleDelete(generatedReport.reportId)}
                                disabled={isDeleting}
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <button
                              className="rc-btn rc-btn-sm rc-btn-primary"
                              onClick={() => handleGenerateSingle(student.studentId)}
                              disabled={isGeneratingThis || !selectedTemplate}
                            >
                              {isGeneratingThis ? 'Generating...' : 'Generate'}
                            </button>
                          )}
                          <button
                            className="rc-btn rc-btn-sm rc-btn-secondary"
                            onClick={() => {
                              // FIX 8: Use absolute backend URL — bare /api/v1 path only works
                              // through Vite dev proxy and breaks in production deployments.
                              const base = import.meta.env.VITE_PORT || '';
                              window.open(
                                `${base}/api/v1/dynamic-reports/preview/${student.studentId}?templateId=${selectedTemplate}&academicYear=${academicYear}&examType=${examType}`,
                                '_blank'
                              );
                            }}
                            disabled={!selectedTemplate}
                          >
                            Preview
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}

      {!selectedClass && (
        <div className="rc-empty">
          <p>Please select a class to view students</p>
        </div>
      )}
    </div>
  );
};

export default DynamicReportManager;
