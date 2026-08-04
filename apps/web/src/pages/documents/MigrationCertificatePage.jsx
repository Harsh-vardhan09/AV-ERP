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
   MIGRATION CERTIFICATE — Production-ready
══════════════════════════════════════════════════════════════ */
const MigrationCertificatePage = () => {
  const { studentId } = useParams();

  const { data, isLoading, isError, error, refetch, isSuccess, dataUpdatedAt } =
    useGetDocumentQuery({ type: 'MIGRATION', studentId }, { skip: !studentId });

  // Fix: useCertificateFormSync returns [form, setForm, header, setHeader]
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

  const { data: templateData } = useGetTemplateQuery('MIGRATION');
  const [generateFromTemplate, { isLoading: generating }] = useGenerateFromTemplateMutation();
  const template          = templateData?.data;
  const hasTemplate       = Boolean(template);
  const generatedSnapshot = doc?.data?.generatedSnapshot || null;
  const layoutMode        = doc?.data?.layoutMode || template?.layoutMode || 'overlay';
  const isStructured      = layoutMode === 'structured';
  const [showGenerated, setShowGenerated] = React.useState(false);
  React.useEffect(() => { if (generatedSnapshot || isStructured) setShowGenerated(true); }, [generatedSnapshot, isStructured]);

  const handleGenerate = async () => {
    if (!studentId) return;
    try {
      await generateFromTemplate({ studentId, type: 'MIGRATION' }).unwrap();
      toast.success('✅ Document generated from template!');
      refetch();
      setShowGenerated(true);
    } catch (e) {
      if (e?.data?.code === 'DOCUMENT_LOCKED') {
        toast.error('🔒 Document is locked. Unlock first.');
      } else {
        toast.error(e?.data?.message || 'Generation failed');
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
      await createDoc({ studentId, type: 'MIGRATION', data: form, schoolSnapshot: header }).unwrap();
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
      toast.success('Unlocked');
      refetch();
    } catch (e) { toast.error(e?.data?.message || 'Unlock failed'); }
  };

  if (!studentId) return null;
  if (isLoading)  return <div className="doc-page-wrap" style={{ padding: 32, color: '#64748b' }}>Loading…</div>;
  if (isError)    return <div className="doc-page-wrap" style={{ padding: 32, color: '#b91c1c' }}>{error?.data?.message || 'Error'}</div>;

  const photoSrc = form.photoUrl || form.photo || '';

  /* School top-line: name · UDISE */
  const schoolTopLine = [header.schoolName, header.udiseCode && `UDISE: ${header.udiseCode}`]
    .filter(Boolean).join('    ·    ');

  return (
    <div className="doc-page-wrap">

      {/* ── Toolbar ── */}
      <div className="doc-toolbar doc-no-print">
        <Link to="/admin/documents/migration">← Migration List</Link>
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
          <button className="doc-btn doc-btn-secondary" onClick={handleGenerate} disabled={generating}>
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

      {/* Certificate Sheet */}
      {generatedSnapshot && showGenerated ? (
        isStructured ? (
          // NEW: clean structured HTML view
          <StructuredCertificateView
            id="migration-print-area"
            layout={template?.layout || []}
            sections={template?.sections || {}}
            data={{ ...form, photoUrl: form.photoUrl || form.photo }}
            schoolSnapshot={header}
            certNumber={doc?.certificateNumber || ''}
            type="MIGRATION"
            locked={locked}
            onChange={(key, val) => setForm((f) => ({ ...f, [key]: val }))}
          />
        ) : (
          // LEGACY: image overlay view
          <CertificateOverlay snapshot={generatedSnapshot} id="migration-print-area" />
        )
      ) : (
        <div className="doc-print-area doc-sheet doc-migration-sheet">

        {/* ── Top meta: school name | cert number ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginBottom: '4px' }} role="presentation">
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'top', fontSize: '8.5pt', fontWeight: 700 }} className="doc-no-upper">
                {schoolTopLine}
              </td>
              <td style={{ verticalAlign: 'top', textAlign: 'right' }}>
                {doc?.certificateNumber && (
                  <span style={{ fontSize: '8.5pt', fontWeight: 700 }} className="doc-no-upper">
                    Cert. No.: {doc.certificateNumber}
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Title ── */}
        <div className="doc-migration-title">Migration Certificate</div>

        {/* ── Intro ── */}
        <p className="doc-migration-intro">
          This is to certify that the following pupil has been a bona fide student of this
          institution. Particulars are taken from the Admission Register.
        </p>

        {/* ══════════════════════════════════════════════
            BODY: fields (75%) | photo (25%)
        ══════════════════════════════════════════════ */}
        <table className="doc-main-outer" role="presentation">
          <tbody>
            <tr>
              {/* LEFT: fields */}
              <td className="doc-main-fields">
                <table className="doc-fields-table" role="presentation">
                  <colgroup>
                    <col style={{ width: '46%' }} />
                    <col style={{ width: '54%' }} />
                  </colgroup>
                  <tbody>

                    <CertificateFieldRow
                      label="Name of Pupil:"
                      value={form.studentName}
                      onChange={sf('studentName')}
                      readOnly={ro}
                    />
                    <CertificateFieldRow
                      label="Father's Name:"
                      value={form.fatherName}
                      onChange={sf('fatherName')}
                      readOnly={ro}
                    />
                    <CertificateFieldRow
                      label="Mother's Name:"
                      value={form.motherName}
                      onChange={sf('motherName')}
                      readOnly={ro}
                    />
                    <CertificateFieldRow
                      label="Date of Birth (Admission Reg.):"
                      value={form.dateOfBirthFormatted}
                      onChange={sf('dateOfBirthFormatted')}
                      readOnly={ro}
                    />
                    <CertificateFieldRow
                      label="Nationality:"
                      value={form.nationality}
                      onChange={sf('nationality')}
                      readOnly={ro}
                    />
                    <CertificateFieldRow
                      label="Religion:"
                      value={form.religion}
                      onChange={sf('religion')}
                      readOnly={ro}
                    />
                    <CertificateFieldRow
                      label="Class Last Attended:"
                      value={form.lastClassAttended}
                      onChange={sf('lastClassAttended')}
                      readOnly={ro}
                    />
                    <CertificateFieldRow
                      label="Passed Promotion Exam:"
                      value={form.whetherPassed}
                      onChange={sf('whetherPassed')}
                      readOnly={ro}
                    />
                    <CertificateFieldRow
                      label="Conduct:"
                      value={form.conduct}
                      onChange={sf('conduct')}
                      readOnly={ro}
                    />
                    <CertificateFieldRow
                      label="Date of Leaving / Migration:"
                      value={form.dateOfLeaving}
                      onChange={sf('dateOfLeaving')}
                      readOnly={ro}
                    />
                    <CertificateFieldRow
                      label="Student Code:"
                      value={form.studentCode}
                      onChange={sf('studentCode')}
                      readOnly={ro}
                    />
                    <CertificateFieldRow
                      label="Remarks:"
                      value={form.remarks}
                      onChange={sf('remarks')}
                      readOnly={ro}
                      multiline
                    />

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
                <div style={{ fontSize: '8pt', fontWeight: 700, marginBottom: 2 }}>Date of Issue</div>
                <div className="doc-line-cell" style={{ borderBottom: '1px solid #000' }}>
                  {ro
                    ? <span className="doc-line-readonly doc-upper">{form.issueDate || '\u00a0'}</span>
                    : <input
                        className="doc-line-input doc-upper"
                        value={form.issueDate || ''}
                        onChange={(e) => sf('issueDate')(e.target.value)}
                      />
                  }
                </div>
              </td>
              <td style={{ width: '38%', textAlign: 'center' }}>
                <div className="doc-footer-stamp doc-no-upper">Principal's stamp / seal</div>
              </td>
              <td style={{ width: '34%' }}>
                <div style={{ fontSize: '8pt', fontWeight: 700, marginBottom: 2, textAlign: 'center' }}>
                  Principal / Head of Institution
                </div>
                <div className="doc-line-cell" style={{ minHeight: '2rem', borderBottom: '1px solid #000' }}>&nbsp;</div>
              </td>
            </tr>
          </tbody>
        </table>

        </div>
      )}{/* /sheet */}
    </div>
  );
};

export default MigrationCertificatePage;
