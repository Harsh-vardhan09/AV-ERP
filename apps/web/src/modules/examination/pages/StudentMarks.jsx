import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useGetMyStudentMarksQuery } from '@modules/people/api/studentApi';
import {
  useGetMyReportCardQuery,
  useDownloadMyReportCardMutation,
} from '@modules/reportcards/api/dynamicReportApi';

/**
 * The student's own report card.
 *
 * No student id is sent anywhere — the server resolves it from the auth
 * cookie, so this component cannot be pointed at anyone else's card.
 */
const ReportCardTab = () => {
  const { data, isLoading, error } = useGetMyReportCardQuery({});
  const [downloadPdf, { isLoading: isDownloading }] = useDownloadMyReportCardMutation();

  const card = data?.data;

  const handleDownload = async () => {
    try {
      const blob = await downloadPdf({}).unwrap();
      if (!(blob instanceof Blob)) {
        throw new Error(blob?.message || 'Download failed');
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = card?.fileName || 'Report_Card.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Could not download the PDF');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-sm font-medium">
          {error?.data?.message || 'Could not load your report card.'}
        </p>
      </div>
    );
  }

  // ── Not yet published ───────────────────────────────────────────────────
  if (!card?.published) {
    const p = card?.progress;
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm px-6 py-14 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
          <span className="text-xl">🔒</span>
        </div>
        <h3 className="text-base font-bold text-slate-900">Report card not published yet</h3>
        <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
          {card?.reason || 'Your report card will appear here once your school publishes it.'}
        </p>

        {p && p.totalSubjects > 0 && (
          <div className="max-w-xs mx-auto mt-6">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
              <span>Marks entry progress</span>
              <span className="tabular-nums">{p.percentComplete}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${p.percentComplete}%` }}
              />
            </div>
            {p.pendingExams?.length > 0 && (
              <p className="text-[11px] text-slate-400 mt-2">
                Awaiting: {p.pendingExams.join(', ')}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Published ───────────────────────────────────────────────────────────
  // Rendered inside a sandboxed iframe so template CSS can't leak into the app.
  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>body{margin:0;padding:16px;background:#fff;font-family:'Times New Roman',Times,serif;}
    table{width:100%;border-collapse:collapse;} th,td{border:1px solid #333;padding:4px 6px;text-align:center;}
    img{max-width:100%;height:auto;}</style>
    <style>${card.css || ''}</style></head><body>${card.html}</body></html>`;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{card.examLabel}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {card.student?.className} {card.student?.section} · Session {card.session?.name}
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-wait text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
        >
          <span>{isDownloading ? 'Preparing PDF…' : '⬇ Download PDF'}</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <iframe
          srcDoc={srcDoc}
          title="Report Card"
          sandbox=""
          className="w-full border-none"
          style={{ minHeight: '1123px' }}
        />
      </div>
    </div>
  );
};

/**
 * Pass / Fail, and the two states the old rule collapsed wrongly.
 *
 * It was: `m.passingMarks ? m.marksObtained >= m.passingMarks : true`
 *   - a MISSING mark became `undefined >= 33` → false → a confident "Fail",
 *     which reads as "the student failed" rather than "nobody marked this"
 *   - a subject with no passingMarks configured became "Pass" unconditionally,
 *     including for a zero
 *   - a mark ABOVE the maximum still passed, so 360/100 showed a green "Pass"
 */
const markStatus = (m) => {
  const value = m?.marksObtained;
  const max = Number(m?.maxMarks);

  if (value === null || value === undefined || value === '') {
    return {
      label: 'Not marked',
      cls: 'bg-slate-50 text-slate-500 border-slate-200',
      hint: 'No marks have been entered for this subject yet.',
    };
  }

  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || (Number.isFinite(max) && max > 0 && num > max)) {
    return {
      label: 'Data error',
      cls: 'bg-amber-50 text-amber-800 border-amber-300',
      hint: `Recorded mark (${value}) is outside the valid range 0–${max || '?'}. Report this to the school office.`,
    };
  }

  if (!m.passingMarks) {
    return {
      label: `${num}/${max || '?'}`,
      cls: 'bg-slate-50 text-slate-600 border-slate-200',
      hint: 'No pass mark is configured for this subject, so no pass/fail can be shown.',
    };
  }

  return num >= m.passingMarks
    ? { label: 'Pass', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', hint: `Pass mark ${m.passingMarks}` }
    : { label: 'Fail', cls: 'bg-rose-50 text-rose-700 border-rose-200', hint: `Pass mark ${m.passingMarks}` };
};

const StudentMarks = () => {
  const [tab, setTab] = useState('marks');
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

      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { id: 'marks',  label: 'Exam Marks' },
          { id: 'report', label: 'Report Card' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              tab === t.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'report' && <ReportCardTab />}

      {tab === 'marks' && <>
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {Object.values(grouped).map((group, i) => {
        const pctNum = group.totalMax > 0 ? (group.totalObtained / group.totalMax) * 100 : 0;
        const percentage = pctNum.toFixed(1);
        // A percentage outside 0–100 is impossible and must not look authoritative.
        // 335.0% in confident indigo read as a real result rather than bad data.
        const pctImpossible = pctNum > 100 || pctNum < 0;
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
                <span
                  title={
                    pctImpossible
                      ? `${group.totalObtained} out of ${group.totalMax} is not a possible result. Report this to the school office.`
                      : undefined
                  }
                  className={`text-xl sm:text-2xl font-extrabold block tracking-tight tabular-nums ${
                    pctImpossible ? 'text-amber-600' : 'text-indigo-600'
                  }`}
                >
                  {pctImpossible ? `⚠ ${percentage}%` : `${percentage}%`}
                </span>
                {pctImpossible && (
                  <span className="text-[10px] font-semibold text-amber-700 block">
                    Invalid data — marks exceed the maximum
                  </span>
                )}
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
                    const status = markStatus(m);
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
                          <span
                            title={status.hint}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${status.cls}`}
                          >
                            {status.label}
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
      </>}
    </div>
  );
};

export default StudentMarks;
