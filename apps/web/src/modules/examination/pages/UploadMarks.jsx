import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  useUploadMarksMutation,
  useUploadMarksExcelMutation,
  useGetMyAssignmentsQuery,
  useGetMyExamsQuery,
  useGetStudentsForMarksQuery,
  useGetExamTemplateQuery,
  useGetExamConfigHealthQuery,
} from '@modules/people/api/teacherApi';
import { useGetActiveSessionQuery } from '@shared/lib/api/adminApi';
import { useGetMarksReadinessQuery } from '@modules/reportcards/api/reportCardApi';
import toast from 'react-hot-toast';

/* ─── Constants ─────────────────────────────────────────────── */
const EMPTY_OBJECT = {};
const EMPTY_ARRAY = [];

const TABS = {
  MANUAL: 'manual',
  EXCEL: 'excel',
};

const TEMPLATE_TIERS = {
  EXAM_SPECIFIC: 1,
  SCHOOL_DEFAULT: 2,
  SCHOOL_FALLBACK: 3,
};

const TIER_LABELS = {
  [TEMPLATE_TIERS.EXAM_SPECIFIC]: 'exam-specific',
  [TEMPLATE_TIERS.SCHOOL_DEFAULT]: 'school default',
  [TEMPLATE_TIERS.SCHOOL_FALLBACK]: 'school fallback',
};

/* ─── Helper Functions ─────────────────────────────────────────────── */

/**
 * Converts snake_case or kebab-case to Title Case
 */
const toLabel = (key) => {
  if (!key || typeof key !== 'string') return '';
  return key
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
};

/**
 * Checks if a field is a total field (auto-calculated)
 */
const isTotalField = (key) => {
  if (!key) return false;
  return /total/i.test(key);
};

/**
 * Extracts term prefix from field name (e.g., "t1_oral" → "t1")
 */
const getTermPrefix = (key) => {
  if (!key || typeof key !== 'string') return null;
  const match = key.toLowerCase().match(/^(t[12])_/);
  return match ? match[1] : null;
};

/**
 * Recalculates all total fields by summing their term siblings
 * e.g., t1_total = t1_oral + t1_half_yearly
 */
const recalcTotals = (fields) => {
  if (!fields || typeof fields !== 'object') return fields;

  const updated = { ...fields };

  Object.keys(fields).forEach((key) => {
    if (!isTotalField(key)) return;

    const term = getTermPrefix(key);
    if (!term) return;

    const sum = Object.entries(fields)
      .filter(([k, v]) => {
        return (
          !isTotalField(k) &&
          getTermPrefix(k) === term &&
          v !== '' &&
          v !== null &&
          v !== undefined
        );
      })
      .reduce((accumulator, [, value]) => {
        const numValue = Number(value);
        return accumulator + (Number.isFinite(numValue) ? numValue : 0);
      }, 0);

    updated[key] = sum;
  });

  return updated;
};

/**
 * Validates a numeric value against constraints
 */
const validateNumericInput = (value, max) => {
  if (value === '' || value === null || value === undefined) {
    return { isValid: true, value: '' };
  }

  const num = Number(value);

  if (!Number.isFinite(num) || num < 0) {
    return { isValid: false, value: 0, error: 'Must be a non-negative number' };
  }

  if (num > max) {
    return { isValid: false, value: max, error: `Maximum allowed is ${max}` };
  }

  return { isValid: true, value: num };
};

/**
 * Safely extracts nested property from object
 */
const getNestedValue = (obj, path, defaultValue = null) => {
  try {
    return path.split('.').reduce((acc, part) => acc?.[part], obj) ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

/* ─── Main Component ─────────────────────────────────────────────── */

const UploadMarks = () => {
  // ─── API Queries ───
  const { data: sessionData, isLoading: sessionLoading, error: sessionError } = useGetActiveSessionQuery();
  const sessionId = getNestedValue(sessionData, 'data._id');

  const {
    data: assignmentData,
    isLoading: assignmentsLoading,
    error: assignmentsError,
  } = useGetMyAssignmentsQuery({ session: sessionId }, { skip: !sessionId });

  const {
    data: examData,
    isLoading: examsLoading,
    error: examsError,
  } = useGetMyExamsQuery({ session: sessionId }, { skip: !sessionId });

  // ─── Local State ───
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [tab, setTab] = useState(TABS.MANUAL);
  const [marks, setMarks] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

  const fileRef = useRef(null);

  // Does this exam have a marks breakdown for this class? Without one, whatever
  // is entered here is stored as a single aggregate number and the component
  // columns of the report card stay blank. Ask before entry, not after.
  const { data: configHealthData } = useGetExamConfigHealthQuery(
    { examId: selectedExam, classId: selectedClass },
    { skip: !selectedExam || !selectedClass }
  );
  const configHealth = configHealthData?.data;

  // ─── Mutations ───
  const [uploadMarks, { isLoading: uploading }] = useUploadMarksMutation();
  const [uploadMarksExcel, { isLoading: uploadingExcel }] = useUploadMarksExcelMutation();

  // ─── Derived Data ───
  const assignments = assignmentData?.data || [];
  const exams = examData?.data || [];

  // ─── Template Query ───
  const {
    data: templateData,
    isLoading: templateLoading,
    error: templateError,
  } = useGetExamTemplateQuery({ examId: selectedExam }, { skip: !selectedExam });

  const templateSchema = templateData?.data?.schema;
  const templateId = templateData?.data?.templateId;
  const templateName = templateData?.data?.templateName;
  const templateTier = templateData?.data?.tier;
  const fieldMaxMap = templateData?.data?.fieldMaxMap || EMPTY_OBJECT;
  const totalMaxMarks = templateData?.data?.totalMaxMarks ?? 100;


  /**
   * Gets the maximum allowed marks for a field
   */
  const getFieldMax = useCallback(
    (fieldKey) => {
      if (!fieldKey) return totalMaxMarks;

      const lower = fieldKey.toLowerCase();

      // Direct match
      if (fieldMaxMap[lower] !== undefined) {
        return Number(fieldMaxMap[lower]);
      }

      // Try without term prefix
      const withoutTerm = lower.replace(/^t[12]_/, '');
      if (fieldMaxMap[withoutTerm] !== undefined) {
        return Number(fieldMaxMap[withoutTerm]);
      }

      return totalMaxMarks;
    },
    [fieldMaxMap, totalMaxMarks]
  );

  const NON_MARKS = new Set(['meta', 'derived', 'attendance']); // 'other' excluded intentionally
  const META_RE = /^(student|name|first|last|middle|father|mother|parent|dob|date|gender|blood|religion|caste|nationality|scholar|roll|admission|pen|address|city|state|pin|phone|email|school|class|section|session|academic|logo|dise|estd|promoted|result|remark)/i;

  /**
   * Build dynamic marks fields from template schema
   */
  const dynamicMarksFields = useMemo(() => {
    if (!templateSchema?.fields?.length) return EMPTY_ARRAY;

    const fields = templateSchema.fields
      .filter((f) => {
        if (f.category === 'marks') return true;
        if (NON_MARKS.has(f.category)) return false;
        // Stale schema fallback: underscore field not matching meta prefix
        if (f.name && f.name.includes('_') && !META_RE.test(f.name)) return true;
        return false;
      })
      .map((f) => ({
        key: f.name,
        label: f.label || toLabel(f.name),
        subject: f.subject,
        component: f.component,
        isLoop: f.isLoop,
        max: getFieldMax(f.name),
      }));

    console.log('[UploadMarks] Template fields detected:', fields.length, fields);
    return fields;
  }, [templateSchema, getFieldMax]);

  const isDynamic = dynamicMarksFields.length > 0;

  // Components must also sum within the subject total: each one can be under its
  // own cap while four of them add up to 360 out of 100. The server enforces this;
  // showing it here stops a teacher discovering it only on submit.
  const sumErrors = useMemo(() => {
    if (!isDynamic) return {};
    const out = {};
    for (const student of marks) {
      const sum = Object.entries(student.fields || {})
        .filter(([k, v]) => !isTotalField(k) && v !== '' && v !== null && Number.isFinite(Number(v)))
        .reduce((s, [, v]) => s + Number(v), 0);
      if (sum > totalMaxMarks) {
        out[`${student.studentId}-__sum`] =
          `Components add up to ${sum}, more than the subject total of ${totalMaxMarks}`;
      }
    }
    return out;
  }, [marks, isDynamic, totalMaxMarks]);

  const blockingErrors = { ...validationErrors, ...sumErrors };
  const hasBlockingErrors = Object.keys(blockingErrors).length > 0;

  /**
   * Derive unique classes from assignments
   */
  const myClasses = useMemo(() => {
    const classMap = new Map();

    assignments.forEach((assignment) => {
      const classId = getNestedValue(assignment, 'classId._id');
      const className = getNestedValue(assignment, 'classId.name');

      if (classId && className) {
        classMap.set(classId, { _id: classId, name: className });
      }
    });

    return Array.from(classMap.values());
  }, [assignments]);

  /**
   * Derive sections for selected class
   */
  const mySections = useMemo(() => {
    if (!selectedClass) return [];

    const sectionMap = new Map();

    assignments
      .filter((a) => getNestedValue(a, 'classId._id') === selectedClass)
      .forEach((assignment) => {
        const sectionId = getNestedValue(assignment, 'sectionId._id');
        const sectionName = getNestedValue(assignment, 'sectionId.name');

        if (sectionId && sectionName) {
          sectionMap.set(sectionId, { _id: sectionId, name: sectionName });
        }
      });

    return Array.from(sectionMap.values());
  }, [assignments, selectedClass]);

  /**
   * Derive subject options for selected class and section
   */
  const subjectOptions = useMemo(() => {
    if (!selectedClass || !selectedSection || !sessionId) return [];

    const subjectMap = new Map();

    assignments
      .filter(
        (a) =>
          getNestedValue(a, 'classId._id') === selectedClass &&
          getNestedValue(a, 'sectionId._id') === selectedSection &&
          getNestedValue(a, 'session._id') === sessionId
      )
      .forEach((assignment) => {
        const subjectId = getNestedValue(assignment, 'subjectId._id');
        const subjectName = getNestedValue(assignment, 'subjectId.name');
        const subjectCode = getNestedValue(assignment, 'subjectId.code');

        if (subjectId && subjectName) {
          subjectMap.set(subjectId, {
            _id: subjectId,
            name: subjectName,
            code: subjectCode,
          });
        }
      });

    return Array.from(subjectMap.values());
  }, [assignments, selectedClass, selectedSection, sessionId]);

  /**
   * Fetch students
   */
  const {
    data: studentData,
    isLoading: studentsLoading,
    error: studentsError,
  } = useGetStudentsForMarksQuery(
    {
      classId: selectedClass,
      sectionId: selectedSection,
      session: sessionId,
    },
    {
      skip: !selectedClass || !selectedSection || !sessionId,
    }
  );

  const students = studentData?.data || [];

  /**
   * Which subjects still need marks for this exam+class before report cards
   * can be released. Refetches after each upload so the teacher sees their own
   * submission land.
   */
  const { data: readinessData, refetch: refetchReadiness } = useGetMarksReadinessQuery(
    {
      classId: selectedClass,
      examId: selectedExam,
      sectionId: selectedSection,
      session: sessionId,
    },
    { skip: !selectedClass || !selectedExam || !sessionId }
  );

  const readiness = readinessData?.data?.exams?.[0] || null;

  const dynamicFieldsKey = useMemo(
    () => dynamicMarksFields.map((f) => f.key).join(','),
    [dynamicMarksFields]
  );

  /**
   * Initialize marks table when students or fields change
   */
  useEffect(() => {
    if (!students.length) {
      setMarks((prev) => (prev.length === 0 ? prev : EMPTY_ARRAY));
      setValidationErrors((prev) => (Object.keys(prev).length === 0 ? prev : EMPTY_OBJECT));
      return;
    }

    const rows = students.map((student) => {
      const userId = getNestedValue(student, 'userId._id');
      const firstName = getNestedValue(student, 'userId.firstName', '');
      const lastName = getNestedValue(student, 'userId.lastName', '');
      const fullName = `${firstName} ${lastName}`.trim();

      return {
        studentId: userId,
        studentName: fullName || 'Unknown Student',
        rollNo: student.rollNo || 'N/A',
        fields: isDynamic
          ? Object.fromEntries(dynamicMarksFields.map((f) => [f.key, '']))
          : {},
        marksObtained: '',
        remarks: '',
      };
    });

    console.log('[UploadMarks] Students loaded:', rows.length);
    console.log('[UploadMarks] Fields mode:', isDynamic ? 'dynamic' : 'legacy');

    setMarks(rows);
    setValidationErrors((prev) => (Object.keys(prev).length === 0 ? prev : EMPTY_OBJECT));
  }, [students, isDynamic, dynamicFieldsKey]);

  /**
   * Handle field value change
   */
  const handleFieldChange = useCallback(
    (studentId, fieldKey, value) => {
      // Total fields are read-only
      if (isDynamic && isTotalField(fieldKey)) return;

      setMarks((prev) =>
        prev.map((student) => {
          if (student.studentId !== studentId) return student;

          if (isDynamic) {
            const max = getFieldMax(fieldKey);
            const validation = validateNumericInput(value, max);

            // Update validation errors
            setValidationErrors((prevErrors) => {
              const key = `${studentId}-${fieldKey}`;
              if (!validation.isValid && validation.error) {
                return { ...prevErrors, [key]: validation.error };
              }
              const { [key]: _, ...rest } = prevErrors;
              return rest;
            });

            return {
              ...student,
              fields: recalcTotals({
                ...student.fields,
                [fieldKey]: validation.value,
              }),
            };
          }

          // Legacy mode — validated too. It used to accept anything, so a typo
          // of 360 out of 100 reached the server unchallenged.
          {
            const max = getFieldMax('total') || totalMaxMarks;
            const validation = validateNumericInput(value, max);
            setValidationErrors((prevErrors) => {
              const key = `${studentId}-marksObtained`;
              if (!validation.isValid && validation.error) {
                return { ...prevErrors, [key]: validation.error };
              }
              const { [key]: _, ...rest } = prevErrors;
              return rest;
            });
            return { ...student, marksObtained: value };
          }
        })
      );
    },
    [isDynamic, getFieldMax, totalMaxMarks]
  );

  /**
   * Handle remarks change
   */
  const handleRemarksChange = useCallback((studentId, value) => {
    setMarks((prev) =>
      prev.map((student) =>
        student.studentId === studentId ? { ...student, remarks: value } : student
      )
    );
  }, []);

  /**
   * Validate all marks before submission
   */
  const validateMarksForSubmission = useCallback(() => {
    const errors = [];

    for (const student of marks) {
      if (isDynamic) {
        for (const [key, val] of Object.entries(student.fields)) {
          if (val === '' || val === null || val === undefined) continue;

          const num = Number(val);
          const cap = getFieldMax(key);

          if (!Number.isFinite(num) || num < 0) {
            errors.push(`Invalid value for ${toLabel(key)} (${student.studentName})`);
          } else if (num > cap) {
            errors.push(
              `${toLabel(key)}: max ${cap}, got ${num} (${student.studentName})`
            );
          }
        }
      } else {
        if (student.marksObtained !== '' && student.marksObtained !== null) {
          const num = Number(student.marksObtained);
          if (!Number.isFinite(num) || num < 0) {
            errors.push(`Invalid marks for ${student.studentName}`);
          }
        }
      }
    }

    return errors;
  }, [marks, isDynamic, getFieldMax]);

  /**
   * Handle manual marks submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate selection
    if (!selectedExam || !selectedSubject || !selectedClass || !selectedSection) {
      toast.error('Please select exam, class, section, and subject');
      return;
    }

    // Validate marks
    const validationErrors = validateMarksForSubmission();
    if (validationErrors.length > 0) {
      validationErrors.forEach((error) => toast.error(error));
      return;
    }

    let payload;

    try {
      if (isDynamic) {
        // Filter and prepare marks with dynamic fields
        const validMarks = marks
          .filter((m) =>
            Object.values(m.fields).some(
              (v) => v !== '' && v !== null && v !== undefined && v !== 0
            )
          )
          .map((m) => ({
            studentId: m.studentId,
            fields: Object.fromEntries(
              Object.entries(m.fields)
                .filter(([, v]) => v !== '' && v !== null && v !== undefined)
                .map(([k, v]) => [k, Number(v)])
            ),
            remarks: m.remarks || '',
          }));

        if (!validMarks.length) {
          toast.error('Please enter marks for at least one student');
          return;
        }

        payload = {
          examId: selectedExam,
          subjectId: selectedSubject,
          classId: selectedClass,
          sectionId: selectedSection,
          session: sessionId,
          marks: validMarks,
          templateId,
        };
      } else {
        // Legacy single-field mode
        const validMarks = marks
          .filter((m) => m.marksObtained !== '' && m.marksObtained !== null)
          .map((m) => ({
            studentId: m.studentId,
            marksObtained: Number(m.marksObtained),
            remarks: m.remarks || '',
          }));

        if (!validMarks.length) {
          toast.error('Please enter marks for at least one student');
          return;
        }

        payload = {
          examId: selectedExam,
          subjectId: selectedSubject,
          classId: selectedClass,
          sectionId: selectedSection,
          session: sessionId,
          marks: validMarks,
          marksType: 'theory',
        };
      }

      console.log('[UploadMarks] Uploading payload:', payload);

      const response = await uploadMarks(payload).unwrap();

      toast.success(response.message || 'Marks uploaded successfully');
      // Readiness lives in a different API slice — refetch it explicitly.
      refetchReadiness();

      // Reset form
      setMarks((prev) =>
        prev.map((m) => ({
          ...m,
          fields: isDynamic
            ? Object.fromEntries(dynamicMarksFields.map((f) => [f.key, '']))
            : {},
          marksObtained: '',
          remarks: '',
        }))
      );
      setValidationErrors({});
    } catch (error) {
      console.error('[UploadMarks] Upload error:', error);
      // The server rejects a batch that cannot be stored and returns the exact
      // per-student problems. Show them — a teacher must never see "saved" for a
      // mark that was altered or never written.
      const perField = error?.data?.details?.errors;
      if (Array.isArray(perField) && perField.length) {
        toast.error(error.data.message, { duration: 6000 });
        perField.slice(0, 5).forEach((e) => toast.error(e, { duration: 6000 }));
        if (perField.length > 5) {
          toast.error(`…and ${perField.length - 5} more`, { duration: 6000 });
        }
        setValidationErrors(
          Object.fromEntries(perField.map((e, i) => [`server_${i}`, e]))
        );
        return;
      }
      toast.error(error?.data?.message || 'Failed to upload marks');
    }
  };

  /**
   * Handle Excel file upload
   */
  const handleExcelUpload = async () => {
    const file = fileRef.current?.files?.[0];

    if (!file) {
      toast.error('Please select an Excel file');
      return;
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Please upload a valid Excel or CSV file');
      return;
    }

    // Validate selection
    if (!selectedExam || !selectedSubject || !selectedClass || !selectedSection) {
      toast.error('Please select exam, class, section, and subject');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('examId', selectedExam);
    formData.append('subjectId', selectedSubject);
    formData.append('classId', selectedClass);
    formData.append('sectionId', selectedSection);
    formData.append('session', sessionId);
    formData.append('marksType', 'theory');

    if (templateId) {
      formData.append('templateId', templateId);
    }

    try {
      const response = await uploadMarksExcel(formData).unwrap();

      toast.success(response.message || 'Excel file uploaded successfully');
      refetchReadiness();

      // Show individual errors if any
      if (response.errors?.length) {
        response.errors.forEach((error) => toast.error(error));
      }

      // Reset file input
      if (fileRef.current) {
        fileRef.current.value = '';
      }
    } catch (error) {
      console.error('[UploadMarks] Excel upload error:', error);
      toast.error(error?.data?.message || 'Failed to upload Excel file');
    }
  };

  /**
   * Reset dependent selections when parent changes
   */
  const handleExamChange = useCallback((value) => {
    setSelectedExam(value);
    setSelectedClass('');
    setSelectedSection('');
    setSelectedSubject('');
    setMarks([]);
    setValidationErrors({});
  }, []);

  const handleClassChange = useCallback((value) => {
    setSelectedClass(value);
    setSelectedSection('');
    setSelectedSubject('');
    setMarks([]);
    setValidationErrors({});
  }, []);

  const handleSectionChange = useCallback((value) => {
    setSelectedSection(value);
    setSelectedSubject('');
    setMarks([]);
    setValidationErrors({});
  }, []);

  const handleSubjectChange = useCallback((value) => {
    setSelectedSubject(value);
  }, []);

  // ─── Computed Values ───
  const canShowStudents =
    selectedExam && selectedClass && selectedSection && selectedSubject;
  const selectedExamObj = exams.find((e) => e._id === selectedExam);

  // The server ships the verdict on each exam (marksWindow). Do NOT recompute it
  // here: this used to mirror the server expression, and when the rule changed on
  // one side the button and the API disagreed. Absent field (older API) = unlocked,
  // and the server still rejects the write with the real reason.
  const marksWindow = selectedExamObj?.marksWindow;
  const marksLocked = !!marksWindow && marksWindow.open === false;
  const marksLockReason = marksWindow?.message || null;
  const marksOpenOn = marksWindow?.opensOn
    ? new Date(marksWindow.opensOn).toLocaleDateString('en-IN', { dateStyle: 'medium' })
    : null;

  // ─── Error Handling ───
  if (sessionError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-lg mb-2">⚠️ Session Error</div>
        <p className="text-gray-600">Failed to load session data. Please refresh the page.</p>
      </div>
    );
  }

  if (!sessionLoading && !sessionId) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-5xl mb-4">📚</div>
        <p className="text-gray-600 text-lg">No active academic session</p>
        <p className="text-gray-500 text-sm mt-2">
          Please activate an academic session to continue.
        </p>
      </div>
    );
  }

  // ─── Loading State ───
  if (sessionLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="text-gray-600 mt-4">Loading session data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Upload Marks</h1>

      {/* Submission progress — report cards unlock once every subject is in */}
      {readiness && readiness.totalSubjects > 0 && (
        <div
          className={`rounded-xl border p-4 mb-6 ${
            readiness.ready ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className={`text-sm font-semibold ${readiness.ready ? 'text-green-800' : 'text-amber-800'}`}>
                {readiness.ready
                  ? 'All subjects submitted — report cards can be released.'
                  : `${readiness.submittedCount} of ${readiness.totalSubjects} subjects submitted`}
              </p>
              {!readiness.ready && readiness.missing?.length > 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  Awaiting: {readiness.missing.map((s) => s.name).join(', ')}
                </p>
              )}
            </div>
            <span
              className={`text-xs font-bold tabular-nums px-2.5 py-1 rounded-lg ${
                readiness.ready ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {readiness.percentComplete}%
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full bg-white/70 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${readiness.ready ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{ width: `${readiness.percentComplete}%` }}
            />
          </div>
        </div>
      )}

      {/* Selection Card */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">
          Select Exam → Class → Section → Subject
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Exam Selection */}
          <div>
            <label
              htmlFor="exam-select"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              Exam *
            </label>
            <select
              id="exam-select"
              value={selectedExam}
              onChange={(e) => handleExamChange(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
              disabled={examsLoading}
              aria-label="Select exam"
            >
              <option value="">
                {examsLoading ? 'Loading exams...' : 'Select Exam'}
              </option>
              {exams.map((exam) => (
                <option key={exam._id} value={exam._id}>
                  {exam.name} ({exam.type?.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
            {examsError && (
              <p className="text-xs text-red-500 mt-1">Failed to load exams</p>
            )}
          </div>

          {/* Class Selection */}
          <div>
            <label
              htmlFor="class-select"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              Class *
            </label>
            <select
              id="class-select"
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              disabled={!selectedExam || assignmentsLoading}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400 focus:ring-2 focus:ring-indigo-300 outline-none"
              aria-label="Select class"
            >
              <option value="">Select Class</option>
              {myClasses.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Selection */}
          <div>
            <label
              htmlFor="section-select"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              Section *
            </label>
            <select
              id="section-select"
              value={selectedSection}
              onChange={(e) => handleSectionChange(e.target.value)}
              disabled={!selectedClass}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400 focus:ring-2 focus:ring-indigo-300 outline-none"
              aria-label="Select section"
            >
              <option value="">Select Section</option>
              {mySections.map((section) => (
                <option key={section._id} value={section._id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Selection */}
          <div>
            <label
              htmlFor="subject-select"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              Subject *
            </label>
            <select
              id="subject-select"
              value={selectedSubject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              disabled={!selectedSection}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400 focus:ring-2 focus:ring-indigo-300 outline-none"
              aria-label="Select subject"
            >
              <option value="">Select Subject</option>
              {subjectOptions.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.name}
                  {subject.code ? ` (${subject.code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Template Information */}
        {selectedExam && templateLoading && (
          <div className="mt-4">
            <span className="inline-flex items-center text-xs bg-gray-50 border border-gray-200 text-gray-500 px-3 py-1.5 rounded-full">
              <svg
                className="animate-spin -ml-1 mr-2 h-3 w-3 text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Resolving template...
            </span>
          </div>
        )}

        {isDynamic && !templateLoading && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center text-xs bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-full font-medium">
              ✨ Template-driven — {dynamicMarksFields.length} field(s)
            </span>
            {templateName && (
              <span className="inline-flex items-center text-xs bg-indigo-50 border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-full">
                📄 {templateName}
                {templateTier && ` (${TIER_LABELS[templateTier] || 'custom'})`}
              </span>
            )}
          </div>
        )}

        {/* "Legacy mode" alone told the teacher nothing about the consequence:
            these marks are stored as one aggregate number, so every component
            column on a component-based report card renders blank. */}
        {!isDynamic && !templateLoading && selectedExam && (
          <div className="mt-4 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
            <p className="font-semibold">⚠️ Single-total mode — no marks breakdown</p>
            <p className="mt-1 leading-relaxed">
              {templateName
                ? `"${templateName}" has no per-component marks fields, so `
                : 'No report card template resolved for this school, so '}
              marks entered here are saved as <strong>one total per subject</strong>. They will
              show in the subject total on the report card, but every component column
              {configHealth?.components?.length
                ? ` (${configHealth.components.join(', ')})`
                : ' (periodic test, notebook, subject enrichment, …)'}{' '}
              will be blank.
            </p>
            {configHealth?.legacy > 0 && (
              <p className="mt-1 text-yellow-800">
                {configHealth.legacy} of {configHealth.total} subject(s) on this exam have no
                marks breakdown configured.
              </p>
            )}
            <p className="mt-1 text-yellow-800">
              Ask an administrator to set the marks distribution on this exam before entering
              marks.
            </p>
          </div>
        )}

        {/* The template is component-based but this exam+class is not configured
            for it — the mismatch that silently produces a blank report card. */}
        {isDynamic && !templateLoading && configHealth?.legacy > 0 && (
          <div className="mt-4 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-900">
            <p className="font-semibold">
              ⚠️ {configHealth.legacy} of {configHealth.total} subject(s) have no marks breakdown
            </p>
            <p className="mt-1 leading-relaxed">
              The report card expects components, but those subjects are configured for a single
              total. Marks entered for them will not fill the component columns.
            </p>
          </div>
        )}

        {templateError && (
          <div className="mt-4">
            <span className="inline-flex items-center text-xs bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-full">
              ❌ Failed to load template
            </span>
          </div>
        )}

        {marksLocked && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            🔒 {marksLockReason}
          </div>
        )}
      </div>

      {/* Tabs */}
      {canShowStudents && (
        <div className="mb-4 flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setTab(TABS.MANUAL)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === TABS.MANUAL
                ? 'bg-white shadow text-indigo-700'
                : 'text-gray-600 hover:text-gray-800'
              }`}
            aria-label="Manual entry tab"
            aria-current={tab === TABS.MANUAL ? 'page' : undefined}
          >
            ✏️ Manual Entry
          </button>
          <button
            onClick={() => setTab(TABS.EXCEL)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === TABS.EXCEL
                ? 'bg-white shadow text-indigo-700'
                : 'text-gray-600 hover:text-gray-800'
              }`}
            aria-label="Excel upload tab"
            aria-current={tab === TABS.EXCEL ? 'page' : undefined}
          >
            📊 Excel Upload
          </button>
        </div>
      )}

      {/* Manual Entry Tab */}
      {canShowStudents && tab === TABS.MANUAL && (
        <>
          {studentsLoading ? (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-gray-600">Loading students...</p>
            </div>
          ) : studentsError ? (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <p className="text-gray-600">Failed to load students</p>
            </div>
          ) : students.length > 0 ? (
            <form onSubmit={handleSubmit}>
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b">
                  <h2 className="font-semibold text-gray-800">
                    Enter marks for {students.length} student(s)
                  </h2>
                  {selectedExamObj && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {selectedExamObj.name}
                    </p>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Roll
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        {isDynamic ? (
                          dynamicMarksFields.map((field) => {
                            const isTotal = isTotalField(field.key);
                            return (
                              <th
                                key={field.key}
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {field.label}
                                {isTotal ? (
                                  <span className="ml-1 text-purple-500 font-normal normal-case">
                                    Σ auto
                                  </span>
                                ) : (
                                  <span className="ml-1 text-indigo-400 font-normal normal-case">
                                    (max {field.max})
                                  </span>
                                )}
                              </th>
                            );
                          })
                        ) : (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Marks
                          </th>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Remarks
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {marks.map((student) => (
                        <tr
                          key={student.studentId}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                            {student.rollNo}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">
                            {student.studentName}
                          </td>
                          {isDynamic ? (
                            dynamicMarksFields.map((field) => {
                              const isTotal = isTotalField(field.key);
                              const value = student.fields?.[field.key];
                              const errorKey = `${student.studentId}-${field.key}`;
                              const hasError = validationErrors[errorKey];

                              if (isTotal) {
                                return (
                                  <td key={field.key} className="px-4 py-3">
                                    <div className="w-24 rounded-lg px-2 py-1.5 text-sm text-center font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700">
                                      {value !== '' &&
                                        value !== null &&
                                        value !== undefined
                                        ? value
                                        : '—'}
                                    </div>
                                  </td>
                                );
                              }

                              return (
                                <td key={field.key} className="px-4 py-3">
                                  <div>
                                    <input
                                      type="number"
                                      min="0"
                                      max={field.max}
                                      step="0.01"
                                      value={value ?? ''}
                                      onChange={(e) =>
                                        handleFieldChange(
                                          student.studentId,
                                          field.key,
                                          e.target.value
                                        )
                                      }
                                      className={`w-24 border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none ${hasError
                                          ? 'border-red-300 bg-red-50'
                                          : ''
                                        }`}
                                      placeholder={`0–${field.max}`}
                                      aria-label={`${field.label} for ${student.studentName}`}
                                      aria-invalid={hasError ? 'true' : 'false'}
                                    />
                                    {hasError && (
                                      <p className="text-xs text-red-500 mt-1">
                                        {hasError}
                                      </p>
                                    )}
                                  </div>
                                </td>
                              );
                            })
                          ) : (
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={student.marksObtained}
                                onChange={(e) =>
                                  handleFieldChange(
                                    student.studentId,
                                    'marksObtained',
                                    e.target.value
                                  )
                                }
                                className="w-24 border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                                placeholder="0"
                                aria-label={`Marks for ${student.studentName}`}
                              />
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={student.remarks}
                              onChange={(e) =>
                                handleRemarksChange(student.studentId, e.target.value)
                              }
                              className="w-full min-w-[150px] border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                              placeholder="Optional"
                              maxLength={200}
                              aria-label={`Remarks for ${student.studentName}`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {hasBlockingErrors && (
                  <div className="px-6 py-3 bg-red-50 border-t border-red-200 text-sm text-red-800">
                    <p className="font-semibold">
                      {Object.keys(blockingErrors).length} value(s) are out of range — fix them
                      before saving
                    </p>
                    <ul className="mt-1 list-disc list-inside space-y-0.5 text-xs">
                      {Object.entries(blockingErrors)
                        .slice(0, 6)
                        .map(([k, msg]) => (
                          <li key={k}>{msg}</li>
                        ))}
                    </ul>
                  </div>
                )}

                <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between flex-wrap gap-4">
                  <button
                    type="submit"
                    disabled={uploading || marksLocked || hasBlockingErrors}
                    title={marksLockReason || undefined}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center"
                  >
                    {marksLocked ? (
                      marksOpenOn ? `Opens on ${marksOpenOn}` : 'Marks entry closed'
                    ) : uploading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      'Upload Marks'
                    )}
                  </button>

                  {isDynamic && (
                    <p className="text-xs text-gray-500">
                      Fields: {dynamicMarksFields.map((f) => f.label).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </form>
          ) : (
            <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm border">
              <div className="text-4xl mb-2">🎓</div>
              <p className="text-lg font-medium">No students found</p>
              <p className="text-sm mt-1">
                There are no students in this class/section combination.
              </p>
            </div>
          )}
        </>
      )}

      {/* Excel Upload Tab */}
      {canShowStudents && tab === TABS.EXCEL && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Upload Marks via Excel</h2>

          {isDynamic && dynamicMarksFields.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-100">
              <h3 className="text-sm font-semibold text-blue-800 mb-3">
                📋 Expected Excel Columns
              </h3>
              <div className="bg-white rounded border border-blue-200 p-3">
                <div className="flex gap-3 flex-wrap text-xs font-mono">
                  <span className="font-bold text-blue-700">Roll No</span>
                  {dynamicMarksFields.map((field) => (
                    <span key={field.key} className="font-bold text-blue-700">
                      {field.label}
                    </span>
                  ))}
                  <span className="font-bold text-blue-700">Remarks</span>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Make sure your Excel file has these exact column headers (case-insensitive).
              </p>
            </div>
          )}

          <div className="flex items-center gap-4 flex-wrap">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              disabled={marksLocked}
              className="border rounded-lg px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-indigo-700 file:text-sm file:font-medium file:cursor-pointer hover:file:bg-indigo-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Select Excel file"
            />
            <button
              onClick={handleExcelUpload}
              disabled={uploadingExcel || marksLocked}
              title={marksLockReason || undefined}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center"
            >
              {marksLocked ? (
                marksOpenOn ? `Opens on ${marksOpenOn}` : 'Marks entry closed'
              ) : uploadingExcel ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                'Upload Excel'
              )}
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              📝 Excel Upload Guidelines
            </h4>
            <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
              <li>Use .xlsx, .xls, or .csv format</li>
              <li>First row must contain column headers</li>
              <li>Roll No column is required to match students</li>
              <li>Numeric values only for marks fields</li>
              <li>Remarks column is optional</li>
              <li>Empty cells will be skipped</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadMarks;