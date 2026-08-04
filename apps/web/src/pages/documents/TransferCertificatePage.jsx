import React from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useGetDocumentQuery,
  useCreateDocumentMutation,
  useUpdateDocumentMutation,
  useLockDocumentMutation,
  useUnlockDocumentMutation,
} from '../../redux/api/documentApi';
import { useGetTemplateQuery, useGenerateFromTemplateMutation } from '../../redux/api/documentTemplateApi';
import {
  CertificateLine,
  CertificateFieldRow,
  StudentPhoto,
  CertificateOverlay,
  useCertificateFormSync,
  usePrintCertificate,
} from './certificateShared';
import StructuredCertificateView from './StructuredCertificateView';
import './documents.css';

/* ══════════════════════════════════════════════════════════════
   TRANSFER CERTIFICATE — Production-ready
══════════════════════════════════════════════════════════════ */
const TransferCertificatePage = () => {
  const { studentId } = useParams();

  const { data, isLoading, isError, error, refetch, isSuccess, dataUpdatedAt } =
    useGetDocumentQuery({ type: 'TC', studentId }, { skip: !studentId });

  const [form, setForm, header, setHeader] = useCertificateFormSync({
    apiData: data,
    isSuccess,
    dataUpdatedAt,
    studentId,
  });

  const doc    = data?.document;
  const locked = !!doc?.isLocked;
  const ro     = locked;

  const sf = (key) => (v) => setForm((f) => ({ ...f, [key]: v }));
  const sh = (key) => (v) => setHeader((h) => ({ ...h, [key]: v }));

  const [createDoc, { isLoading: creating }]  = useCreateDocumentMutation();
  const [updateDoc, { isLoading: saving }]    = useUpdateDocumentMutation();
  const [lockDoc,   { isLoading: locking }]   = useLockDocumentMutation();
  const [unlockDoc, { isLoading: unlocking }] = useUnlockDocumentMutation();
  const handlePrint = usePrintCertificate();
  const handleDownload = () => {
    if (!doc?._id) return;
    const base = `${import.meta.env.VITE_PORT}`.replace(/\/$/, '');
    window.open(`${base}/api/v1/documents/download/${doc._id}`, '_blank', 'noopener');
  };

  const { data: templateData } = useGetTemplateQuery('TC');
  const [generateFromTemplate, { isLoading: generating }] = useGenerateFromTemplateMutation();
  const template           = templateData?.data;
  const hasTemplate        = Boolean(template);
  const generatedSnapshot  = doc?.data?.generatedSnapshot || null;
  // layoutMode: 'structured' uses StructuredCertificateView; 'overlay' uses CertificateOverlay
  const layoutMode         = doc?.data?.layoutMode || template?.layoutMode || 'overlay';
  const isStructured       = layoutMode === 'structured';
  const [showGenerated, setShowGenerated] = React.useState(false);
  React.useEffect(() => { if (generatedSnapshot || isStructured) setShowGenerated(true); }, [generatedSnapshot, isStructured]);

  const handleGenerate = async () => {
    if (!studentId) return;
    try {
      const res = await generateFromTemplate({ studentId, type: 'TC' }).unwrap();
      toast.success('✅ Document generated from template!');
      refetch();
      setShowGenerated(true);
    } catch (e) {
      const msg = e?.data?.message || 'Generation failed';
      if (e?.data?.code === 'DOCUMENT_LOCKED') {
        toast.error('🔒 Document is locked. Unlock first.');
      } else {
        toast.error(msg);
      }
    }
  };

  const handleSave = async () => {
    if (!doc?._id) return;
    try {
      await updateDoc({ id: doc._id, data: form, schoolSnapshot: header }).unwrap();
      toast.success('Saved successfully');
      refetch();
    } catch (e) { toast.error(e?.data?.message || 'Save failed'); }
  };

  const handleCreate = async () => {
    try {
      await createDoc({ studentId, type: 'TC', data: form, schoolSnapshot: header }).unwrap();
      toast.success('Draft created');
      refetch();
    } catch (e) { toast.error(e?.data?.message || 'Could not create'); }
  };

  const handleLock = async () => {
    if (!doc?._id) return;
    try {
      await lockDoc(doc._id).unwrap();
      toast.success('Locked & finalized');
      refetch();
    } catch (e) { toast.error(e?.data?.message || 'Lock failed'); }
  };

  const handleUnlock = async () => {
    if (!doc?._id) return;
    try {
      await unlockDoc(doc._id).unwrap();
      toast.success('Unlocked for editing');
      refetch();
    } catch (e) { toast.error(e?.data?.message || 'Unlock failed'); }
  };

  if (!studentId) return null;
  if (isLoading)  return <div className="doc-page-wrap" style={{ padding: 32, color: '#64748b' }}>Loading…</div>;
  if (isError)    return <div className="doc-page-wrap" style={{ padding: 32, color: '#b91c1c' }}>{error?.data?.message || 'Error loading document'}</div>;

  /* ── Helpers ── */
  const photoSrc = form.photoUrl || form.photo || '';

  /* ── Inline field: renders a bordered input or plain text depending on lock ── */
  const InlineField = ({ fk, hk, width = '120px', bold = false }) => {
    const val   = fk ? (form[fk] ?? '') : (header[hk] ?? '');
    const setFn = fk ? sf(fk) : sh(hk);
    if (ro) return (
      <span style={{
        display: 'inline-block', minWidth: width, verticalAlign: 'baseline',
        borderBottom: '1px solid #000', fontWeight: bold ? 700 : 'inherit',
        textTransform: 'uppercase', padding: '0 2px',
      }}>
        {val || '\u00a0'}
      </span>
    );
    return (
      <input
        value={val}
        onChange={(e) => setFn(e.target.value)}
        style={{
          display: 'inline-block', width, border: 'none', borderBottom: '1px solid #000',
          background: 'transparent', font: 'inherit', fontWeight: bold ? 700 : 'inherit',
          textTransform: 'uppercase', padding: '0 2px', outline: 'none', verticalAlign: 'baseline',
        }}
      />
    );
  };

  return (
    <div className="doc-page-wrap">

      {/* ── Toolbar ── */}
      <div className="doc-toolbar doc-no-print">
        <Link to="/admin/documents/tc">← TC List</Link>
        {locked && <div className="doc-lock-banner">🔒 Finalized — unlock to edit</div>}
        {!doc && (
          <button className="doc-btn doc-btn-primary" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating…' : 'Create Draft'}
          </button>
        )}
        {doc && !locked && (
          <button className="doc-btn doc-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
        {doc && !locked && hasTemplate && (
          <button className="doc-btn doc-btn-secondary" onClick={handleGenerate} disabled={generating} title="Generate from your custom TC template">
            {generating ? 'Generating…' : '⚡ Generate from Template'}
          </button>
        )}
        {generatedSnapshot && (
          <button className="doc-btn doc-btn-secondary" onClick={() => setShowGenerated((p) => !p)}>
            {showGenerated ? '✏️ Field Editor' : '📄 Template View'}
          </button>
        )}
        {doc && !locked && (
          <button className="doc-btn doc-btn-secondary" onClick={handleLock} disabled={locking}>
            {locking ? 'Locking…' : 'Lock / Finalize'}
          </button>
        )}
        {doc && locked && (
          <button className="doc-btn doc-btn-danger" onClick={handleUnlock} disabled={unlocking}>
            {unlocking ? 'Unlocking…' : 'Unlock (Admin)'}
          </button>
        )}
        <button className="doc-btn doc-btn-secondary" onClick={handlePrint}>🖨 Print</button>
        {doc && <button className="doc-btn doc-btn-secondary" onClick={handleDownload}>⬇ Download PDF</button>}
      </div>

      {/* ══════════════════════════════════════════════
          CERTIFICATE SHEET (A4)
      ══════════════════════════════════════════════ */}

      {/* ── Template-generated view ── */}
      {generatedSnapshot && showGenerated ? (
        isStructured ? (
          // NEW: clean HTML structured rendering with inline editing
          <StructuredCertificateView
            id="tc-print-area"
            layout={template?.layout || []}
            sections={template?.sections || {}}
            data={{ ...form, photoUrl: form.photoUrl || form.photo }}
            schoolSnapshot={header}
            certNumber={doc?.certificateNumber || ''}
            type="TC"
            locked={locked}
            onChange={(key, val) => setForm((f) => ({ ...f, [key]: val }))}
          />
        ) : (
          // LEGACY: image overlay view
          <CertificateOverlay snapshot={generatedSnapshot} id="tc-print-area" />
        )
      ) : (
        <div className="doc-print-area doc-sheet">

        {/* Cert number */}
        {doc?.certificateNumber && (
          <div className="doc-cert-no doc-no-upper">Cert. No.: {doc.certificateNumber}</div>
        )}

        {/* ── Header: motto | logo | motto ── */}
        <table className="doc-header-table" role="presentation">
          <tbody>
            <tr>
              <td className="doc-h-left doc-no-upper">बांग्लार शिक्षा</td>
              <td className="doc-h-center doc-no-upper">
                {header.logoUrl
                  ? <img src={header.logoUrl} alt="School logo" />
                  : <div className="doc-header-logo-placeholder">Logo</div>
                }
                <div className="doc-header-tagline-bn">
                  শিক্ষা আনে সভ্যতা, সভ্যতা আনে মানবিকতা
                </div>
              </td>
              <td className="doc-h-right">EDUCATION<br />FIRST</td>
            </tr>
          </tbody>
        </table>

        {/* ── School name (large) ── */}
        <div className="doc-school-block doc-no-upper">
          <div className="doc-school-name-text">
            <CertificateLine
              value={header.schoolName || ''}
              onChange={sh('schoolName')}
              readOnly={ro}
            />
          </div>
        </div>

        {/* ── UDISE + Location on one compact row ── */}
        <div className="doc-school-meta-row" style={{ fontSize: '8.5pt', fontWeight: 700, marginBottom: 2 }}>
          <span className="doc-upper">UDISE Code: </span>
          <InlineField hk="udiseCode" width="120px" bold />
          {header.schoolLocationLine && (
            <span className="doc-no-upper" style={{ marginLeft: 8 }}>
              &nbsp;|&nbsp; {header.schoolLocationLine}
            </span>
          )}
        </div>

        <hr className="doc-hr" />
        <div className="doc-title">Transfer Certificate</div>

        {/* ══════════════════════════════════════════════
            BODY: fields (76%) | photo (24%)
        ══════════════════════════════════════════════ */}
        <table className="doc-main-outer" role="presentation">
          <tbody>
            <tr>
              {/* LEFT: fields */}
              <td className="doc-main-fields">
                <table className="doc-fields-table" role="presentation">
                  <colgroup>
                    <col style={{ width: '42%' }} />
                    <col style={{ width: '58%' }} />
                  </colgroup>
                  <tbody>

                    <CertificateFieldRow
                      label="Student's Name:"
                      value={form.studentName}
                      onChange={sf('studentName')}
                      readOnly={ro}
                    />

                    {/* Student Code + PEN on same row */}
                    <tr>
                      <td colSpan={2} style={{ paddingTop: '4px', paddingBottom: '2px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }} role="presentation">
                          <colgroup>
                            <col style={{ width: '24%' }} />
                            <col style={{ width: '26%' }} />
                            <col style={{ width: '16%' }} />
                            <col style={{ width: '34%' }} />
                          </colgroup>
                          <tbody>
                            <tr>
                              <td className="doc-td-label" style={{ paddingTop: '5px' }}>Student Code:</td>
                              <td className="doc-td-value">
                                <CertificateLine value={form.studentCode} onChange={sf('studentCode')} readOnly={ro} />
                              </td>
                              <td className="doc-td-label" style={{ paddingTop: '5px' }}>PEN:</td>
                              <td className="doc-td-value">
                                <CertificateLine value={form.pen} onChange={sf('pen')} readOnly={ro} />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    <CertificateFieldRow label="Father's Name:"     value={form.fatherName}   onChange={sf('fatherName')}   readOnly={ro} />
                    <CertificateFieldRow label="Mother's Name:"     value={form.motherName}   onChange={sf('motherName')}   readOnly={ro} />
                    <CertificateFieldRow label="Address:"           value={form.address}      onChange={sf('address')}      readOnly={ro} multiline />
                    <CertificateFieldRow label="District:"          value={form.district}     onChange={sf('district')}     readOnly={ro} />
                    <CertificateFieldRow
                      label="Date of Birth (Admission Reg.):"
                      value={form.dateOfBirthFormatted}
                      onChange={sf('dateOfBirthFormatted')}
                      readOnly={ro}
                    />
                    <CertificateFieldRow label="Last Class Passed:"    value={form.lastClassPassed}   onChange={sf('lastClassPassed')}   readOnly={ro} />
                    <CertificateFieldRow label="Last Class Attended:"  value={form.lastClassAttended} onChange={sf('lastClassAttended')} readOnly={ro} />
                    <CertificateFieldRow label="Reason for Transfer:"  value={form.reasonForTransfer} onChange={sf('reasonForTransfer')} readOnly={ro} multiline />

                    {/* Certification statement */}
                    <tr>
                      <td
                        colSpan={2}
                        style={{
                          paddingTop: '10px',
                          paddingBottom: '4px',
                          fontSize: '9.5pt',
                          fontWeight: 600,
                          textTransform: 'none',
                        }}
                      >
                        Certified that the student has been transferred on{' '}
                        <InlineField fk="certificationStatementDate" width="100px" />.
                      </td>
                    </tr>

                  </tbody>
                </table>
              </td>

              {/* RIGHT: photo */}
              <td className="doc-main-photo">
                <StudentPhoto url={photoSrc} />
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Footer ── */}
        <table className="doc-footer-table" role="presentation">
          <tbody>
            <tr>
              <td style={{ width: '28%' }}>
                <div style={{ fontSize: '8pt', fontWeight: 700, marginBottom: '2px' }}>Date</div>
                <CertificateLine value={form.issueFooterDate} onChange={sf('issueFooterDate')} readOnly={ro} />
              </td>
              <td style={{ width: '38%', textAlign: 'center' }}>
                <div className="doc-footer-stamp doc-no-upper">Principal's stamp / seal</div>
              </td>
              <td style={{ width: '34%', textAlign: 'right' }}>
                <div style={{ fontSize: '8pt', fontWeight: 700, marginBottom: 2, textAlign: 'center' }}>Head of Institution</div>
                <div className="doc-line-cell" style={{ minHeight: '2rem', borderBottom: '1px solid #000' }}>&nbsp;</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Acknowledgement ── */}
        <div className="doc-ack">
          <div className="doc-ack-title">Acknowledgement on Receipt of Transfer Certificate</div>

          <table className="doc-fields-table" role="presentation">
            <colgroup>
              <col style={{ width: '36%' }} />
              <col style={{ width: '64%' }} />
            </colgroup>
            <tbody>
              <CertificateFieldRow label="Student Name:"  value={form.studentName}  onChange={sf('studentName')}  readOnly={ro} />
              <CertificateFieldRow label="Father's Name:" value={form.fatherName}   onChange={sf('fatherName')}   readOnly={ro} />
              {/* Code + Last Class */}
              <tr>
                <td colSpan={2} style={{ paddingTop: 4 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }} role="presentation">
                    <colgroup>
                      <col style={{ width: '24%' }} />
                      <col style={{ width: '26%' }} />
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '28%' }} />
                    </colgroup>
                    <tbody>
                      <tr>
                        <td className="doc-td-label" style={{ paddingTop: 5 }}>Student Code:</td>
                        <td className="doc-td-value">
                          <CertificateLine value={form.studentCode} onChange={sf('studentCode')} readOnly={ro} />
                        </td>
                        <td className="doc-td-label" style={{ paddingTop: 5 }}>Last Class:</td>
                        <td className="doc-td-value">
                          <CertificateLine value={form.lastClassAttended} onChange={sf('lastClassAttended')} readOnly={ro} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="doc-footer-table" role="presentation" style={{ marginTop: 12 }}>
            <tbody>
              <tr>
                <td style={{ width: '28%' }}>
                  <div style={{ fontSize: '8pt', fontWeight: 700, marginBottom: 2 }}>Date</div>
                  <CertificateLine value={form.acknowledgementDate} onChange={sf('acknowledgementDate')} readOnly={ro} />
                </td>
                <td style={{ width: '38%' }} />
                <td style={{ width: '34%', textAlign: 'right' }}>
                  <div style={{ fontSize: '8pt', fontWeight: 700, marginBottom: 2, textAlign: 'center' }}>Signature of Guardian</div>
                  <div className="doc-line-cell" style={{ minHeight: '2rem', borderBottom: '1px solid #000' }}>&nbsp;</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        </div>
      )}{/* end sheet */}
    </div>
  );
};

export default TransferCertificatePage;
