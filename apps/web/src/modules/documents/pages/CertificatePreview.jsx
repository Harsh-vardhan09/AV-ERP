import React from 'react';
import { Link, useParams } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { useGetGeneratedDocumentQuery } from '@modules/documents/api/generatedDocumentsApi';
import '@styles/certificate.css';

const CertificatePreview = () => {
  const { id } = useParams();
  const { data, isLoading } = useGetGeneratedDocumentQuery(id, { skip: !id });
  const doc = data?.data;

  const handlePrint = () => window.print();
  const handleExportPdf = () => {
    const el = document.getElementById('print-area');
    if (!el || !doc) return;
    html2pdf().set({
      margin: 10,
      filename: `${doc.type}_${doc.data?.studentName || 'certificate'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(el).save();
  };

  return (
    <div className="certificate-page">
      <div className="doc-no-print" style={{ marginBottom: 8 }}>
        <Link to="/admin/documents">← Documents</Link>
        <button onClick={handlePrint} style={{ marginLeft: 10 }}>Print</button>
        <button onClick={handleExportPdf} style={{ marginLeft: 10 }}>Export PDF</button>
      </div>
      {isLoading && <p>Loading preview...</p>}
      {!isLoading && doc && (
        <div className="certificate-wrapper" id="print-area">
          <header className="certificate-header">
            <h1>{doc.schoolInfo?.name || 'School'}</h1>
            <p>{doc.schoolInfo?.address || '—'}</p>
          </header>
          <h2 className="certificate-title">{doc.type === 'TC' ? 'Transfer Certificate' : 'Migration Certificate'}</h2>
          <p className="certificate-certno">Certificate No: {doc._id}</p>
          <section className="certificate-body">
            {doc.fieldsUsed.map((field) => (
              <div className="certificate-row" key={field.key}>
                <span className="certificate-label">{field.label}</span>
                <span>{doc.data?.[field.key] ?? '—'}</span>
              </div>
            ))}
          </section>
          <footer className="certificate-footer">
            <div>
              <p>Principal's Signature</p>
              <p>Date: {new Date(doc.createdAt).toLocaleDateString()}</p>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
};

export default CertificatePreview;
