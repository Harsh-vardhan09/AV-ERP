import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useCreateGeneratedDocumentMutation,
  useGetNewDocumentContextQuery,
} from '@modules/documents/api/generatedDocumentsApi';
import '@modules/documents/pages/documents.css';
import '@styles/certificate.css';

/**
 * Dynamic certificate form (TC / Migration).
 *
 * The field list comes from the server (DocumentTemplateConfig) — nothing here is
 * hardcoded per certificate type. Only the presentation is opinionated: the page
 * uses the same doc-* shell as MigrationCertificatePage so the two routes stop
 * looking like different products.
 */

/** Fields that make a certificate legally incomplete if left blank. */
const ALWAYS_REQUIRED = {
  TC: ['dateOfLeaving'],
  MIGRATION: ['dateOfLeaving'],
};

const labelFor = (field) =>
  field.label || field.key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

const NewDocumentForm = ({ forcedType = '' }) => {
  const { type = 'TC', studentId } = useParams();
  const resolvedType = forcedType || type || 'TC';
  const navigate = useNavigate();
  const { data, isLoading } = useGetNewDocumentContextQuery(
    { type: resolvedType, studentId },
    { skip: !studentId }
  );
  const [createDoc, { isLoading: creating }] = useCreateGeneratedDocumentMutation();

  const fields = data?.data?.fields || [];
  const initialData = data?.data?.initialData || {};
  const studentName = data?.data?.studentName || '';
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  React.useEffect(() => {
    setFormData(initialData);
    setErrors({});
    setTouched({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.data?.studentId]);

  const title = useMemo(
    () => (resolvedType === 'TC' ? 'Transfer Certificate' : 'Migration Certificate'),
    [resolvedType]
  );
  const backTo = resolvedType === 'TC' ? '/admin/documents/tc' : '/admin/documents/migration';

  /** A field is required if the config says so, or if it is on the always-required list. */
  const isRequired = (field) =>
    Boolean(field.required) || (ALWAYS_REQUIRED[resolvedType] || []).includes(field.key);

  const validate = (values) => {
    const next = {};
    for (const field of fields) {
      const raw = values[field.key];
      const empty = raw === undefined || raw === null || String(raw).trim() === '';
      if (isRequired(field) && empty) {
        next[field.key] = `${labelFor(field)} is required`;
      }
    }
    return next;
  };

  const handleChange = (key, value) => {
    const next = { ...formData, [key]: value };
    setFormData(next);
    // Clear an existing error as soon as the field becomes valid — re-validating
    // the whole form on every keystroke would flag fields not yet reached.
    if (errors[key]) {
      const revalidated = validate(next);
      setErrors((prev) => ({ ...prev, [key]: revalidated[key] }));
    }
  };

  const handleBlur = (key) => {
    setTouched((p) => ({ ...p, [key]: true }));
    const revalidated = validate(formData);
    setErrors((prev) => ({ ...prev, [key]: revalidated[key] }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(formData);
    const bad = Object.keys(found).filter((k) => found[k]);
    if (bad.length) {
      setErrors(found);
      setTouched(Object.fromEntries(fields.map((f) => [f.key, true])));
      toast.error(
        bad.length === 1
          ? found[bad[0]]
          : `${bad.length} required fields are missing — see the highlighted rows.`
      );
      document.getElementById(`fld-${bad[0]}`)?.focus();
      return;
    }

    try {
      const created = await createDoc({
        studentId,
        type: resolvedType,
        data: formData,
      }).unwrap();
      toast.success('Certificate generated');
      navigate(`/admin/documents/preview/${created?.data?._id}`);
    } catch (err) {
      toast.error(err?.data?.message || 'Generation failed');
    }
  };

  const requiredCount = fields.filter(isRequired).length;
  const missingCount = Object.values(validate(formData)).filter(Boolean).length;

  return (
    <div className="doc-page-wrap">
      <div className="doc-toolbar doc-no-print">
        <Link to={backTo}>← {resolvedType === 'TC' ? 'TC' : 'Migration'} List</Link>
        <div className="doc-form-heading">
          {title}
          {studentName && <span className="doc-form-subject"> — {studentName}</span>}
        </div>
        <div className="doc-form-toolbar-right">
          {requiredCount > 0 && (
            <span className={`doc-form-progress ${missingCount ? 'is-incomplete' : 'is-complete'}`}>
              {missingCount
                ? `${missingCount} required field${missingCount > 1 ? 's' : ''} left`
                : 'All required fields complete'}
            </span>
          )}
          <button
            type="submit"
            form="doc-dynamic-form"
            className="doc-btn doc-btn-primary"
            disabled={creating}
          >
            {creating ? 'Generating…' : 'Generate Certificate'}
          </button>
        </div>
      </div>

      {isLoading && <div className="doc-form-card doc-form-muted">Loading form configuration…</div>}

      {!isLoading && fields.length === 0 && (
        <div className="doc-form-card doc-form-muted">
          No fields are configured for this certificate type. Set them up in{' '}
          <Link to="/admin/documents/template-config">Template Configuration</Link>.
        </div>
      )}

      {!isLoading && fields.length > 0 && (
        <form id="doc-dynamic-form" className="doc-form-card" onSubmit={submit} noValidate>
          <p className="doc-form-legend">
            Fields marked <span className="doc-req-star">*</span> are required.
          </p>

          <div className="doc-form-grid">
            {fields.map((field) => {
              const required = isRequired(field);
              const showError = Boolean(errors[field.key]) && touched[field.key];
              const wide = field.type === 'textarea';
              const id = `fld-${field.key}`;

              return (
                <div
                  key={field.key}
                  className={`doc-form-field ${wide ? 'is-wide' : ''} ${showError ? 'has-error' : ''}`}
                >
                  <label htmlFor={id}>
                    {labelFor(field)}
                    {required && (
                      <span className="doc-req-star" aria-hidden="true">
                        {' '}
                        *
                      </span>
                    )}
                  </label>

                  {field.type === 'textarea' ? (
                    <textarea
                      id={id}
                      name={field.key}
                      rows={3}
                      aria-required={required}
                      aria-invalid={showError || undefined}
                      aria-describedby={showError ? `${id}-err` : undefined}
                      value={formData[field.key] ?? ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      onBlur={() => handleBlur(field.key)}
                    />
                  ) : (
                    <input
                      id={id}
                      name={field.key}
                      type={field.type || 'text'}
                      aria-required={required}
                      aria-invalid={showError || undefined}
                      aria-describedby={showError ? `${id}-err` : undefined}
                      value={formData[field.key] ?? ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      onBlur={() => handleBlur(field.key)}
                    />
                  )}

                  {showError && (
                    <span className="doc-form-error" id={`${id}-err`} role="alert">
                      {errors[field.key]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="doc-form-actions">
            <Link to={backTo} className="doc-btn doc-btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="doc-btn doc-btn-primary" disabled={creating}>
              {creating ? 'Generating…' : 'Generate Certificate'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default NewDocumentForm;
