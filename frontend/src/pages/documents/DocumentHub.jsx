import React from 'react';
import { Link } from 'react-router-dom';
import './documents.css';

const DocumentHub = () => (
  <div className="doc-page-wrap">
    <div className="doc-hub-head">
      <h1 className="doc-hub-title">Documents</h1>
      <p className="doc-hub-subtitle">
      Transfer and migration certificates are admin-only. Data is loaded from student records and school settings.
      </p>
    </div>
    <div className="doc-hub-grid">
      <Link to="/admin/documents/tc" className="doc-hub-card">
        <h2>📋 Transfer Certificate</h2>
        <p>Issue and finalize TCs with lock control. Select a student to open the certificate form or generate from template.</p>
        <span className="doc-hub-link">Open Module →</span>
      </Link>
      <Link to="/admin/documents/migration" className="doc-hub-card">
        <h2>🎓 Migration Certificate</h2>
        <p>Create migration certificates with the same security and lock workflow.</p>
        <span className="doc-hub-link">Open Module →</span>
      </Link>
      <Link to="/admin/documents/template-config" className="doc-hub-card doc-hub-card-template">
        <h2>🧠 Field Config Templates</h2>
        <p>Configure certificate fields for TC/Migration. Forms and print previews are generated automatically from your saved field list.</p>
        {/* <span className="doc-hub-badge">No Hardcoding</span> */}
        <span className="doc-hub-link">Configure Fields →</span>
      </Link>
    </div>
  </div>
);

export default DocumentHub;
