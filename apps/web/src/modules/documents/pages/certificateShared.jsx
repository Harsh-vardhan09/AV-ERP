import React, { useCallback, useEffect, useState } from 'react';

/* ─────────────────────────────────────────────────
   URL helpers
───────────────────────────────────────────────── */

/** Return the backend API origin (Express server base URL). */
export function getApiOrigin() {
  const env = import.meta.env?.VITE_PORT || import.meta.env?.VITE_API_URL;
  if (env && /^https?:\/\//i.test(String(env).trim())) {
    return String(env).trim().replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return '';
}

/**
 * Convert any stored photo value into an absolute browser-loadable URL.
 * Handles: absolute http(s) URLs, protocol-relative //…, relative /uploads/…
 */
export function resolvePhotoSrc(photoUrl, photoAlias) {
  const raw = (
    (typeof photoUrl === 'string' ? photoUrl : '') ||
    (typeof photoAlias === 'string' ? photoAlias : '') ||
    ''
  ).trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  const origin = getApiOrigin();
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return origin ? `${origin}${path}` : path;
}

/* ─────────────────────────────────────────────────
   Form sync hook
───────────────────────────────────────────────── */
export function useCertificateFormSync({ apiData, isSuccess, dataUpdatedAt, studentId }) {
  const [form, setForm] = useState({});
  const [header, setHeader] = useState({});

  useEffect(() => {
    if (!isSuccess || !apiData?.mergedData) return;
    const m = { ...apiData.mergedData };

    // Resolve photo from every possible field the backend may send
    const rawPhoto =
      m.photoUrl ||
      m.photo ||
      apiData?.data?.photo ||
      '';
    const resolvedPhoto = resolvePhotoSrc(rawPhoto);
    m.photoUrl = resolvedPhoto;
    m.photo    = resolvedPhoto;

    setForm(m);
    setHeader({ ...(apiData.schoolSnapshot || {}) });
  }, [studentId, isSuccess, dataUpdatedAt, apiData]);

  return [form, setForm, header, setHeader];
}

/* ─────────────────────────────────────────────────
   CertificateLine — single underlined field
───────────────────────────────────────────────── */
export function CertificateLine({ value, onChange, readOnly, multiline }) {
  const v = value ?? '';

  if (readOnly) {
    return (
      <div className="doc-line-cell">
        <span className="doc-line-readonly doc-upper">{v || '\u00a0'}</span>
      </div>
    );
  }

  if (multiline) {
    return (
      <div className="doc-line-cell">
        <textarea
          className="doc-line-input doc-upper"
          value={v}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          style={{ resize: 'none', overflow: 'hidden' }}
          onInput={(e) => {
            // Auto-grow height
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
        />
      </div>
    );
  }

  return (
    <div className="doc-line-cell">
      <input
        className="doc-line-input doc-upper"
        value={v}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────
   CertificateFieldRow — label + value row
───────────────────────────────────────────────── */
export function CertificateFieldRow({ label, value, onChange, readOnly, multiline }) {
  return (
    <tr>
      <td className="doc-td-label">{label}</td>
      <td className="doc-td-value">
        <CertificateLine
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          multiline={multiline}
        />
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────────────
   StudentPhoto — fixed 28mm × 35mm frame
───────────────────────────────────────────────── */
export function StudentPhoto({ url }) {
  const src = resolvePhotoSrc(url);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
  }, [src]);

  if (!src || errored) {
    return (
      <div
        className="doc-photo-placeholder doc-no-upper"
        role="img"
        aria-label="No photo on file"
      >
        <span style={{ fontSize: '7pt', color: '#94a3b8', textAlign: 'center', lineHeight: 1.3 }}>
          Affix<br />Passport<br />Size<br />Photo
        </span>
      </div>
    );
  }

  return (
    <div className="doc-photo-frame">
      <img
        src={src}
        alt="Student"
        className="doc-student-photo"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────
   usePrintCertificate
   Waits for images to load, then prints.
   Uses body class toggle for maximum compatibility.
───────────────────────────────────────────────── */
export function usePrintCertificate() {
  return useCallback(() => {
    const doPrint = () => {
      requestAnimationFrame(() => window.print());
    };

    // Find all student photos that haven't loaded yet
    const root = document.querySelector('.doc-print-area');
    const imgs = root
      ? Array.from(root.querySelectorAll('img.doc-student-photo'))
      : [];

    const notLoaded = imgs.filter((img) => {
      const s = img.getAttribute('src');
      return s && s.trim() && !img.complete;
    });

    if (notLoaded.length === 0) {
      doPrint();
      return;
    }

    let pending = notLoaded.length;
    const done = () => {
      pending -= 1;
      if (pending <= 0) doPrint();
    };
    notLoaded.forEach((img) => {
      img.addEventListener('load',  done, { once: true });
      img.addEventListener('error', done, { once: true });
    });
  }, []);
}

/* ─────────────────────────────────────────────────
   CertificateOverlay
   Renders a generated certificate by placing text
   fields on top of the saved template image.
   Uses percentage positions so it scales perfectly.
───────────────────────────────────────────────── */
export function CertificateOverlay({ snapshot, id }) {
  if (!snapshot) return null;

  const { templateSnapshot, studentData } = snapshot;
  if (!templateSnapshot?.templateImageUrl) return null;

  const { templateImageUrl, fields = [], imageWidth = 794, imageHeight = 1123 } = templateSnapshot;
  const data = studentData || {};

  // Aspect ratio of the original image
  const aspect = imageHeight / imageWidth;

  return (
    <div
      id={id}
      className="doc-print-area cert-overlay-wrapper"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '210mm',
        margin: '0 auto',
        background: '#fff',
        boxShadow: '0 4px 24px rgba(15,23,42,0.08)',
        border: '1px solid #94a3b8',
      }}
    >
      <div style={{ position: 'relative', width: '100%', paddingBottom: `${aspect * 100}%` }}>
        {/* Background template image */}
        <img
          src={templateImageUrl}
          alt="Certificate template"
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'fill',
            display: 'block',
            pointerEvents: 'none',
          }}
          draggable={false}
        />

        {/* Overlay fields */}
        {fields.map((field, i) => {
          const widthPercent = ((Number(field.width) || 200) / Math.max(1, Number(imageWidth) || 794)) * 100;
          const fontSizeScale = (Number(field.fontSize) || 14) / Math.max(1, Number(imageWidth) || 794);
          return (
          <div
            key={`${field.key}-${i}`}
            style={{
              position:   'absolute',
              left:       `${field.xPercent}%`,
              top:        `${field.yPercent}%`,
              transform:  'translateY(-50%)',
              fontSize:   `clamp(8px, ${(fontSizeScale * 100).toFixed(3)}vw, ${field.fontSize}px)`,
              fontWeight: field.fontWeight || 'normal',
              color:      field.color || '#000',
              fontFamily: field.fontFamily || 'Arial',
              width:      `${Math.min(100, Math.max(1, widthPercent))}%`,
              lineHeight: 1.3,
              whiteSpace: 'pre-wrap',
              wordBreak:  'break-word',
              textAlign:  field.alignment || 'left',
              overflow:   'hidden',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {data[field.key] || ''}
          </div>
        );
        })}
      </div>
    </div>
  );
}
