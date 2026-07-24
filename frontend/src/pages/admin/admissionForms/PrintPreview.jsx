import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useGetStudentDetailsQuery,
} from '../../../redux/api/admissionApi';
import {
  useGetActiveAdmissionTemplateQuery,
  useGenerateAdmissionPDFMutation,
} from '../../../redux/api/admissionTemplateApi';

const API_BASE = import.meta.env.VITE_PORT;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

// ─── Static field resolver (used when no template is active) ──────────────────
const resolveField = (key, student) => {
  const p = student?.parentDetails || {};
  const b = student?.bankDetails || {};
  const map = {
    name:              `${student.firstName||''} ${student.middleName||''} ${student.lastName||''}`.trim() || '—',
    admissionNo:       student.admissionNumber || '—',
    rollNo:            student.rollNo || '—',
    srnNo:             student.srnNo || '—',
    penNo:             student.pen || student.penNo || '—',
    apaarId:           student.apaarId || '—',
    className:         student.classId?.name || '—',
    section:           student.sectionId?.name || '—',
    session:           student.session?.sessionName || student.session?.name || '—',
    admissionDate:     fmtDate(student.admissionDate),
    dateOfBirth:       fmtDate(student.dateOfBirth),
    gender:            student.gender || '—',
    bloodGroup:        student.bloodGroup || '—',
    nationality:       student.nationality || 'Indian',
    religion:          student.religion || '—',
    caste:             student.caste || '—',
    category:          student.category || '—',
    phone:             student.phone || '—',
    whatsappNo:        student.whatsappNo || student.phone || '—',
    address:           student.address || '—',
    city:              student.city || '—',
    state:             student.state || '—',
    pincode:           student.pincode || '—',
    aadharNo:          student.aadharCard || '—',
    ssmId:             student.ssmId || '—',
    familyId:          student.familyId || '—',
    rte:               student.rte ? 'Yes' : 'No',
    bplStudent:        student.bplStudent ? 'Yes' : 'No',
    bplCardNo:         student.bplCardNo || '—',
    casteApplicationNo:  student.casteApplicationNo || '—',
    casteApplicationDate: student.casteApplicationDate ? fmtDate(student.casteApplicationDate) : '—',
    boardEnrollNo:     student.boardEnrollNo || '—',
    ladliLaxmiNo:      student.ladliLaxmiNo || '—',
    scholarshipId:     student.scholarshipId || '—',
    previousSchool:    student.previousSchool || '—',
    fatherName:        p.father?.name || '—',
    fatherPhone:       p.father?.phone || '—',
    fatherOccupation:  p.father?.occupation || '—',
    fatherQualification: p.father?.qualification || '—',
    fatherIncome:      p.father?.annualIncome || '—',
    fatherAadhar:      student.fatherAadharCard || '—',
    motherName:        p.mother?.name || '—',
    motherPhone:       p.mother?.phone || '—',
    motherOccupation:  p.mother?.occupation || '—',
    motherQualification: p.mother?.qualification || '—',
    motherAadhar:      student.motherAadharCard || '—',
    guardianName:      p.guardian?.name || '—',
    guardianPhone:     p.guardian?.phone || '—',
    guardianRelation:  p.guardian?.relation || '—',
    bankName:          b.bankName || '—',
    accountNo:         b.accountNumber || '—',
    ifsc:              b.ifsc || '—',
    branchName:        b.branchName || '—',
  };
  return map[key] ?? '—';
};

// ─── Static field groups ──────────────────────────────────────────────────────
const GROUPS = [
  { title: 'Basic Information', fields: [
    ['name','Full Name'],['admissionNo','Admission No.'],['rollNo','Roll No.'],
    ['srnNo','SRN No.'],['penNo','PEN No.'],['apaarId','APAAR ID'],
    ['className','Class'],['section','Section'],['session','Session'],['admissionDate','Admission Date'],
  ]},
  { title: 'Personal Details', fields: [
    ['dateOfBirth','Date of Birth'],['gender','Gender'],['bloodGroup','Blood Group'],
    ['nationality','Nationality'],['religion','Religion'],['caste','Caste'],['category','Category'],
    ['phone','Phone'],['whatsappNo','WhatsApp'],['address','Address'],
    ['city','City'],['state','State'],['pincode','Pincode'],
  ]},
  { title: 'Identity & Government IDs', fields: [
    ['aadharNo','Aadhaar No.'],['ssmId','Samagra ID'],['familyId','Family ID'],
    ['rte','RTE'],['bplStudent','BPL'],['bplCardNo','BPL Card No.'],
    ['casteApplicationNo','Caste Cert. No.'],['casteApplicationDate','Caste Cert. Date'],
    ['boardEnrollNo','Board Enroll No.'],['ladliLaxmiNo','Ladli Laxmi No.'],
    ['scholarshipId','Scholarship ID'],['previousSchool','Previous School'],
  ]},
  { title: "Father's Details", fields: [
    ['fatherName','Name'],['fatherPhone','Phone'],['fatherOccupation','Occupation'],
    ['fatherQualification','Qualification'],['fatherIncome','Annual Income'],['fatherAadhar','Aadhaar No.'],
  ]},
  { title: "Mother's Details", fields: [
    ['motherName','Name'],['motherPhone','Phone'],['motherOccupation','Occupation'],
    ['motherQualification','Qualification'],['motherAadhar','Aadhaar No.'],
  ]},
  { title: 'Guardian Details', fields: [
    ['guardianName','Name'],['guardianPhone','Phone'],['guardianRelation','Relation'],
  ]},
  { title: 'Bank Details', fields: [
    ['bankName','Bank Name'],['accountNo','Account No.'],['ifsc','IFSC Code'],['branchName','Branch'],
  ]},
];

// ─── Static printable form ────────────────────────────────────────────────────
function StaticForm({ student }) {
  if (!student) return null;
  const fullName = `${student.firstName||''} ${student.middleName||''} ${student.lastName||''}`.trim();
  const photo    = student.documents?.photo;

  // Compact row font sizes for tight A4 fit
  const labelStyle = { minWidth:110, fontSize:9, color:'#6b7280', fontWeight:600, flexShrink:0 };
  const valueStyle = { fontSize:9, color:'#111827', flex:1 };

  return (
    <div id="admission-print-form" style={{
      background:'#fff',
      width:'190mm',        /* exactly fits A4 with 10mm margins each side */
      maxWidth:'190mm',
      margin:'0 auto',
      padding:'10mm 0',     /* top/bottom breathing room within page margin */
      fontFamily:'Arial,Helvetica,sans-serif',
      fontSize:9,
      color:'#111827',
      boxSizing:'border-box',
    }}>
      {/* Header */}
      <div style={{ textAlign:'center', borderBottom:'2px solid #1d4ed8', paddingBottom:6, marginBottom:8 }}>
        <div style={{ fontSize:14, fontWeight:800, color:'#1d4ed8', letterSpacing:1 }}>SCHOOL ADMISSION FORM</div>
        <div style={{ fontSize:9, color:'#6b7280', marginTop:2 }}>Academic Session: {resolveField('session', student)}</div>
      </div>

      {/* Student header row */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:8 }}>
        <div style={{ border:'1px solid #d1d5db', width:60, height:72, borderRadius:4, overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#f9fafb' }}>
          {photo
            ? <img src={photo} alt={fullName} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <span style={{ fontSize:20, fontWeight:700, color:'#1d4ed8' }}>{`${student.firstName?.[0]||''}${student.lastName?.[0]||''}`.toUpperCase()}</span>
          }
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#111827', marginBottom:4 }}>{fullName}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0 16px' }}>
            {[['Admission No.', student.admissionNumber],['Roll No.', student.rollNo],['Class', student.classId?.name],['Section', student.sectionId?.name],['Status', student.status],['Admission Date', fmtDate(student.admissionDate)]].map(([l,v]) => (
              <div key={l} style={{ borderBottom:'1px solid #e5e7eb', padding:'2px 0' }}>
                <span style={{ fontSize:8, color:'#9ca3af', fontWeight:600 }}>{l}: </span>
                <span style={{ fontSize:9, color:'#111827', fontWeight:600 }}>{v||'—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sections — 2-column grid, compact rows */}
      {GROUPS.map(g => (
        <div key={g.title} style={{ marginBottom:6 }}>
          <div style={{ background:'#1d4ed8', color:'#fff', padding:'2px 8px', fontSize:8.5, fontWeight:700, borderRadius:2, marginBottom:3 }}>{g.title}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
            {g.fields.map(([k, label]) => (
              <div key={k} style={{ display:'flex', borderBottom:'1px solid #f3f4f6', padding:'1.5px 0' }}>
                <span style={labelStyle}>{label}:</span>
                <span style={valueStyle}>{resolveField(k, student)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Signatures */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginTop:12, paddingTop:8, borderTop:'1px solid #e5e7eb' }}>
        {["Student's Signature","Parent's Signature","Principal's Signature"].map(lbl => (
          <div key={lbl} style={{ textAlign:'center' }}>
            <div style={{ borderBottom:'1px solid #374151', paddingBottom:20, marginBottom:3 }} />
            <div style={{ fontSize:8, color:'#6b7280' }}>{lbl}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:6, fontSize:8, color:'#9ca3af', textAlign:'right' }}>
        Printed on: {new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PrintPreview() {
  const { id }          = useParams();
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const autoPrint       = searchParams.get('action') === 'print';
  const iframeRef       = useRef(null);

  const [templateHtml, setTemplateHtml]     = useState('');
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError]   = useState(null);

  const { data: sd, isLoading: sl } = useGetStudentDetailsQuery(id);
  const { data: activeData }        = useGetActiveAdmissionTemplateQuery();
  const [generatePDF, { isLoading: isGenerating }] = useGenerateAdmissionPDFMutation();

  const student        = sd?.data;
  const activeTemplate = activeData?.data;

  // Fetch rendered template HTML for this student
  const fetchTemplateHtml = useCallback(async () => {
    if (!activeTemplate?._id || !id) return;
    setTemplateLoading(true);
    setTemplateError(null);
    try {
      const url = `${API_BASE}/api/v1/admission-templates/${activeTemplate._id}/preview?studentId=${id}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        // Try to get a readable server message
        let msg = `Server error ${res.status}`;
        try {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const j = await res.json();
            msg = j.message || msg;
          }
        } catch (_) {}
        throw new Error(msg);
      }
      const html = await res.text();
      setTemplateHtml(html);
    } catch (err) {
      setTemplateError(err.message);
    } finally {
      setTemplateLoading(false);
    }
  }, [activeTemplate?._id, id]);


  useEffect(() => { fetchTemplateHtml(); }, [fetchTemplateHtml]);

  // Auto-print static form (no template) when ?action=print
  useEffect(() => {
    if (autoPrint && student && !activeTemplate) {
      setTimeout(() => window.print(), 800);
    }
  }, [autoPrint, student, activeTemplate]);

  // Auto-print template iframe when loaded + autoPrint
  const handleIframeLoad = () => {
    if (autoPrint && iframeRef.current) {
      setTimeout(() => {
        try { iframeRef.current.contentWindow.print(); } catch (_) { window.print(); }
      }, 600);
    }
  };

  // ── Print Template ────────────────────────────────────────────────────────────
  // PRIMARY: Print the already-rendered iframe directly — no popup, no blank page.
  // FALLBACK: popup window with templateHtml injected (if iframe unavailable).
  const handlePrintTemplate = useCallback(() => {
    // ── Primary: iframe is already loaded on screen — print it directly ──────
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch (_) {
        // cross-origin or sandboxed iframe — fall through to popup fallback
      }
    }

    // ── Fallback: open templateHtml in a popup and print ─────────────────────
    if (!templateHtml) {
      toast.error('Template not loaded yet. Please wait for the preview to finish loading.');
      return;
    }

    const a4Css = `
<style id="__a4_override__">
  @page { size: A4 portrait; margin: 10mm; }
  @media print {
    html, body {
      width: 210mm !important;
      background: #fff !important;
      margin: 0 !important; padding: 0 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .report-container {
      width: 190mm !important;
      min-height: unset !important;
      margin: 0 auto !important;
      padding: 0 !important;
      box-shadow: none !important;
      border: none !important;
    }
    table  { page-break-inside: avoid; width: 100% !important; }
    tr, td, th { page-break-inside: avoid; }
    img    { max-width: 100% !important; }
  }
</style>`;

    const printHtml = templateHtml.includes('</head>')
      ? templateHtml.replace('</head>', a4Css + '\n</head>')
      : templateHtml + a4Css;

    const win = window.open('', '_blank', 'width=860,height=1200,scrollbars=yes');
    if (!win) {
      toast.error('Pop-up blocked. Please allow pop-ups for this site, or use Download PDF instead.');
      return;
    }

    win.document.open();
    win.document.write(printHtml);
    win.document.close();

    let printed = false;
    const safePrint = () => {
      if (printed) return;
      printed = true;
      try {
        const container = win.document.querySelector('.report-container') || win.document.body;
        const contentH  = container.scrollHeight;
        const a4H = Math.floor((297 - 20) * 96 / 25.4);
        if (contentH > a4H) {
          const scale = (a4H / contentH).toFixed(4);
          const s = win.document.createElement('style');
          s.textContent = `@media print { html { zoom: ${scale}; } }`;
          win.document.head.appendChild(s);
        }
      } catch (_) {}
      setTimeout(() => { win.focus(); win.print(); }, 400);
    };

    win.onload = () => safePrint();
    setTimeout(() => safePrint(), 1800);
  }, [templateHtml, iframeRef]);


  // Print static form fallback
  const handlePrintStatic = () => window.print();

  // Download PDF via Puppeteer
  const handleDownloadPDF = async () => {
    try {
      const res = await generatePDF({ studentId: id }).unwrap();
      const url = `${API_BASE}${res.data.downloadUrl}`;
      toast.success('PDF generated! Downloading…');
      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = res.data.fileName || 'AdmissionForm.pdf';
      a.target   = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      toast.error(err?.data?.message || 'PDF generation failed. Please try again.');
    }
  };

  // ── Loading ──
  if (sl) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-sm">Student not found.</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-blue-500 underline text-sm">Go back</button>
      </div>
    );
  }

  const fullName = `${student.firstName||''} ${student.middleName||''} ${student.lastName||''}`.trim();

  return (
    <>
      {/* ── Action bar (hidden on print) ── */}
      <div className="print:hidden flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to List
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Admission Form — {fullName}</h1>
          {activeTemplate && (
            <p className="text-xs text-emerald-600 mt-0.5">
              ✓ Template: <strong>{activeTemplate.name}</strong>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Download PDF (Puppeteer-generated) */}
          <button
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            {isGenerating ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Download PDF</>
            )}
          </button>

          {/* Print — uses dynamic template when loaded, static form as fallback */}
          <button
            onClick={templateHtml ? handlePrintTemplate : handlePrintStatic}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            {templateHtml ? 'Print Template' : 'Print Form'}
          </button>
        </div>
      </div>


      {/* ── Template preview via iframe ── */}
      {activeTemplate && (
        <div className="mb-6">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <span className="text-xs font-semibold text-gray-600">Template Preview — {activeTemplate.name}</span>
              <div className="flex items-center gap-2">
                {templateLoading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                {templateError && (
                  <button
                    onClick={fetchTemplateHtml}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    ↺ Retry
                  </button>
                )}
              </div>
            </div>

            {/* Loading skeleton */}
            {templateLoading && (
              <div className="p-8 space-y-3 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            )}

            {/* Error panel */}
            {!templateLoading && templateError && (
              <div className="p-6 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">Could not load template preview</p>
                  <p className="text-xs text-gray-500 mb-2">{templateError}</p>
                  <p className="text-xs text-gray-400">
                    The backend may have a stale template reference. Click Retry — if it still fails, use Download PDF or Print Form (static) below.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={fetchTemplateHtml}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Retry Preview
                  </button>
                  <button
                    onClick={handlePrintStatic}
                    className="px-4 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                  >
                    Print Static Form
                  </button>
                </div>
              </div>
            )}

            {/* Rendered template iframe */}
            {!templateLoading && templateHtml && (
              <iframe
                ref={iframeRef}
                srcDoc={templateHtml}
                title="Admission Form Template Preview"
                onLoad={handleIframeLoad}
                style={{ width:'100%', height:'1100px', border:'none', display:'block' }}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Static form: shown when NO dynamic template is active ── */}
      {!activeTemplate && (
        <div id="admission-print-form">
          <StaticForm student={student} />
        </div>
      )}

      {/* ── Print CSS for static fallback ── */}
      {!activeTemplate && (
        <style>{`
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          @media print {
            body * { visibility: hidden; }
            #admission-print-form,
            #admission-print-form * { visibility: visible; }
            #admission-print-form {
              position: fixed;
              left: 0; top: 0;
              width: 190mm;
              max-width: 190mm;
              margin: 0;
              padding: 0;
              border: none !important;
              box-shadow: none !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              font-size: 9pt;
            }
          }
        `}</style>
      )}
    </>
  );
}
