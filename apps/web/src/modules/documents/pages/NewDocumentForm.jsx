import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useCreateGeneratedDocumentMutation,
  useGetNewDocumentContextQuery,
} from '../api/generatedDocumentsApi';
import '../../../styles/certificate.css';

const NewDocumentForm = ({ forcedType = '' }) => {
  const { type = 'TC', studentId } = useParams();
  const resolvedType = forcedType || type || 'TC';
  const navigate = useNavigate();
  const { data, isLoading } = useGetNewDocumentContextQuery({ type: resolvedType, studentId }, { skip: !studentId });
  const [createDoc, { isLoading: creating }] = useCreateGeneratedDocumentMutation();

  const fields = data?.data?.fields || [];
  const initialData = data?.data?.initialData || {};
  const [formData, setFormData] = useState({});

  React.useEffect(() => {
    setFormData(initialData);
  }, [data?.data?.studentId]);

  const title = useMemo(() => (resolvedType === 'TC' ? 'Transfer Certificate' : 'Migration Certificate'), [resolvedType]);

  const handleChange = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      const created = await createDoc({ studentId, type: resolvedType, data: formData }).unwrap();
      toast.success('Certificate generated');
      navigate(`/admin/documents/preview/${created?.data?._id}`);
    } catch (err) {
      toast.error(err?.data?.message || 'Generation failed');
    }
  };

  return (
    <div className="certificate-page">
      <div className="doc-no-print" style={{ marginBottom: 8 }}>
        <Link to="/admin/documents">← Documents</Link>
      </div>
      <h2>{title} — Dynamic Form</h2>
      {isLoading && <p>Loading form config...</p>}
      {!isLoading && (
        <form onSubmit={submit}>
          {fields.map((field) => (
            <div key={field.key} className="doc-form-field">
              <label htmlFor={field.key}>{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea
                  id={field.key}
                  name={field.key}
                  required={field.required}
                  value={formData[field.key] ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
              ) : (
                <input
                  id={field.key}
                  name={field.key}
                  type={field.type || 'text'}
                  required={field.required}
                  value={formData[field.key] ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
              )}
            </div>
          ))}
          <button type="submit" disabled={creating}>
            {creating ? 'Generating...' : 'Generate Certificate'}
          </button>
        </form>
      )}
    </div>
  );
};

export default NewDocumentForm;
