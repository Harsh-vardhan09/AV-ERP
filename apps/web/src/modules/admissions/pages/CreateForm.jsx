import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdArrowBack, MdSave, MdAdd, MdDelete, MdDragIndicator } from 'react-icons/md';
import toast from 'react-hot-toast';
import { useCreateFormMutation, useGetPredefinedFieldsQuery } from '../api/customFormApi';

/* ─── Tiny Rich-Text bar ──────────────────────────────────────────────────── */
const TOOLBAR_ACTIONS = [
  { cmd: 'bold',          icon: 'B',  style: { fontWeight: 700 } },
  { cmd: 'italic',        icon: 'I',  style: { fontStyle: 'italic' } },
  { cmd: 'underline',     icon: 'U',  style: { textDecoration: 'underline' } },
  { cmd: 'insertUnorderedList', icon: '• List', style: {} },
  { cmd: 'insertOrderedList',   icon: '1. List', style: {} },
];

const RichEditor = ({ value, onChange, placeholder, height = 120 }) => {
  const ref = React.useRef(null);
  const exec = (cmd) => { document.execCommand(cmd, false, null); ref.current?.focus(); };
  const handleInput = () => { if (onChange) onChange(ref.current.innerHTML); };

  // Set initial content once
  React.useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
    }
  }, []);

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 9, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 2, padding: '6px 8px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
        {TOOLBAR_ACTIONS.map(a => (
          <button key={a.cmd} onMouseDown={e => { e.preventDefault(); exec(a.cmd); }}
            style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, ...a.style }}>
            {a.icon}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        style={{ minHeight: height, padding: '10px 12px', fontSize: 13, outline: 'none', color: '#111' }}
      />
    </div>
  );
};

/* ─── Toggle switch ───────────────────────────────────────────────────────── */
const Toggle = ({ checked, onChange, disabled }) => (
  <button type="button" disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    style={{
      width: 42, height: 24, borderRadius: 12, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      background: checked ? '#22c55e' : '#e5e7eb', position: 'relative', transition: 'background .25s', flexShrink: 0,
    }}>
    <span style={{
      position: 'absolute', top: 3,
      left: checked ? 21 : 3,
      width: 18, height: 18, borderRadius: '50%', background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .25s',
    }} />
  </button>
);

/* ─── Section card ────────────────────────────────────────────────────────── */
const Card = ({ title, children, style = {} }) => (
  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 22, marginBottom: 18, boxShadow: '0 1px 3px rgba(0,0,0,.04)', ...style }}>
    {title && <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: '0 0 16px', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>{title}</h3>}
    {children}
  </div>
);

/* ─── Input row label ─────────────────────────────────────────────────────── */
const Label = ({ children, required }) => (
  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
    {children}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
  </label>
);

const Input = ({ value, onChange, placeholder, type = 'text', style = {} }) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder}
    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', ...style }} />
);

/* ═══════════════════════════════════════════════════════════════════════════ */
const CreateForm = () => {
  const navigate = useNavigate();
  const [createForm, { isLoading: saving }] = useCreateFormMutation();
  const { data: predefData } = useGetPredefinedFieldsQuery();

  const ALL_PREDEFINED = predefData?.data || [];

  /* ── form state ── */
  const [title, setTitle]                 = useState('');
  const [content, setContent]             = useState('');
  const [contentPos, setContentPos]       = useState('before');
  const [fieldMode, setFieldMode]         = useState('predefined'); // 'predefined' | 'custom'

  // Predefined fields: map from fieldKey → { enabled, required }
  const [predMap, setPredMap] = useState(() => {
    const m = {};
    // Name, Email Address, Subject, Message enabled by default
    ['name','emailAddress','subject','message'].forEach(k => { m[k] = { enabled: true, required: false }; });
    return m;
  });

  // Custom fields
  const [customFields, setCustomFields] = useState([]);

  // Right-panel
  const [status, setStatus]               = useState(true);
  const [linkToLead, setLinkToLead]       = useState(true);
  const [registrationForm, setRegistrationForm] = useState(false);
  const [session, setSession]             = useState('');

  // Email config
  const [receiverEmail, setReceiverEmail] = useState('');
  const [emailSubject, setEmailSubject]   = useState('');
  const [emailSignature, setEmailSignature] = useState('');

  // Auto reply
  const [autoReply, setAutoReply]           = useState(false);
  const [replySubject, setReplySubject]     = useState('');
  const [replyBody, setReplyBody]           = useState('');
  const [replyTo, setReplyTo]               = useState('');

  // Payment
  const [enablePayment, setEnablePayment] = useState(false);

  /* ── predefined field toggle ── */
  const togglePredField = (fieldKey, prop) => {
    setPredMap(prev => ({
      ...prev,
      [fieldKey]: {
        enabled:  prop === 'enabled' ? !prev[fieldKey]?.enabled  : (prev[fieldKey]?.enabled  ?? false),
        required: prop === 'required' ? !prev[fieldKey]?.required : (prev[fieldKey]?.required ?? false),
      },
    }));
  };

  /* ── custom fields ── */
  const addCustomField = () => {
    setCustomFields(prev => [...prev, { _id: Date.now(), label: '', fieldType: 'text', options: '', required: false }]);
  };
  const updateCustomField = (id, key, val) => {
    setCustomFields(prev => prev.map(f => f._id === id ? { ...f, [key]: val } : f));
  };
  const removeCustomField = (id) => {
    setCustomFields(prev => prev.filter(f => f._id !== id));
  };

  /* ── submit ── */
  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Form title is required'); return; }

    const predefinedFields = ALL_PREDEFINED.map((pf, idx) => ({
      fieldName: pf.fieldName,
      fieldKey:  pf.fieldKey,
      enabled:   predMap[pf.fieldKey]?.enabled  ?? false,
      required:  predMap[pf.fieldKey]?.required ?? false,
      order:     idx,
    }));

    const cFields = customFields.map((f, idx) => ({
      label:     f.label,
      fieldType: f.fieldType,
      options:   f.options ? f.options.split('\n').map(s => s.trim()).filter(Boolean) : [],
      required:  f.required,
      order:     idx,
    }));

    try {
      await createForm({
        title, content, contentPosition: contentPos,
        fieldMode, predefinedFields, customFields: cFields,
        status, linkToLead, registrationForm, session,
        receiverEmail, emailSubject, emailSignature,
        autoReply, replyEmailSubject: replySubject, replyEmailBody: replyBody, replyToEmail: replyTo,
        enablePayment,
      }).unwrap();
      toast.success('Form created successfully!');
      navigate('/admin/custom-forms');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create form');
    }
  };

  const inputSx = { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
  const rowSx   = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/admin/custom-forms')}
            style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MdArrowBack size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: 0 }}>Create New Form</h1>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Build a custom enquiry form for your school.</p>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 9, border: 'none', background: saving ? '#a5b4fc' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 2px 10px rgba(99,102,241,.35)' }}>
          <MdSave size={17} /> {saving ? 'Saving…' : 'Submit'}
        </button>
      </div>

      {/* Info note */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#1e40af', marginBottom: 20, lineHeight: 1.6 }}>
        <strong>Note:</strong> Forms with <em>Predefined Fields</em> can be linked to the Leads module. Forms with <em>Custom Fields</em> cannot be linked to Leads — the "Link to Lead" option will be disabled.
      </div>

      {/* 2-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT COLUMN ── */}
        <div>

          {/* Title */}
          <Card>
            <Label required>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Admission Enquiry Form" />
          </Card>

          {/* Content */}
          <Card title="Content">
            <RichEditor value={content} onChange={setContent} placeholder="Write introduction / instructions…" height={130} />
            <div style={{ marginTop: 14 }}>
              <Label>Content Position</Label>
              <select value={contentPos} onChange={e => setContentPos(e.target.value)}
                style={{ ...inputSx, width: 'auto', minWidth: 180 }}>
                <option value="before">Before Form</option>
                <option value="after">After Form</option>
              </select>
            </div>
          </Card>

          {/* Field Mode Tabs */}
          <Card title="Form Fields">
            {/* Tabs */}
            <div style={{ display: 'flex', borderRadius: 9, overflow: 'hidden', border: '1px solid #e5e7eb', marginBottom: 20, width: 'fit-content' }}>
              {['predefined','custom'].map(mode => (
                <button key={mode} onClick={() => setFieldMode(mode)}
                  style={{
                    padding: '9px 28px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    background: fieldMode === mode ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#f8fafc',
                    color: fieldMode === mode ? '#fff' : '#374151',
                    transition: 'all .2s',
                  }}>
                  {mode === 'predefined' ? 'Pre-defined Fields' : 'Custom Fields'}
                </button>
              ))}
            </div>

            {fieldMode === 'predefined' && (
              <>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
                  Enable the fields you want to show in your form. You can also drag and drop to sort the fields.
                </p>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px', gap: 8, padding: '8px 10px', background: '#f8fafc', borderRadius: 7, marginBottom: 8, fontSize: 12, fontWeight: 600, color: '#6b7280' }}>
                  <span>Field Name</span>
                  <span style={{ textAlign: 'center' }}>Enable</span>
                  <span style={{ textAlign: 'center' }}>Required</span>
                </div>
                {ALL_PREDEFINED.map(pf => {
                  const state = predMap[pf.fieldKey] || { enabled: false, required: false };
                  return (
                    <div key={pf.fieldKey}
                      style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px', gap: 8, alignItems: 'center', padding: '8px 10px', borderRadius: 7, marginBottom: 3, background: state.enabled ? '#fafbff' : '#fff', border: `1px solid ${state.enabled ? '#e0e7ff' : '#f1f5f9'}`, transition: 'all .15s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MdDragIndicator size={14} color="#d1d5db" />
                        <span style={{ fontSize: 13, color: state.enabled ? '#4338ca' : '#374151', fontWeight: state.enabled ? 500 : 400 }}>{pf.fieldName}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <Toggle checked={state.enabled} onChange={() => togglePredField(pf.fieldKey, 'enabled')} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <Toggle
                          checked={state.required}
                          onChange={() => togglePredField(pf.fieldKey, 'required')}
                          disabled={!state.enabled}
                        />
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {fieldMode === 'custom' && (
              <div>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
                  Add your own custom fields. Note: forms with custom fields cannot be linked to Leads.
                </p>
                {customFields.map((cf, idx) => (
                  <div key={cf._id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 10, background: '#fafbff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1' }}>Field {idx + 1}</span>
                      <button onClick={() => removeCustomField(cf._id)}
                        style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #fee2e2', background: '#fff5f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                        <MdDelete size={13} />
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <Label>Label</Label>
                        <Input value={cf.label} onChange={e => updateCustomField(cf._id, 'label', e.target.value)} placeholder="Field label" />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <select value={cf.fieldType} onChange={e => updateCustomField(cf._id, 'fieldType', e.target.value)}
                          style={{ ...inputSx }}>
                          {['text','textarea','number','email','tel','date','select','checkbox','radio','file'].map(t => (
                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {['select','radio','checkbox'].includes(cf.fieldType) && (
                      <div style={{ marginBottom: 10 }}>
                        <Label>Options (one per line)</Label>
                        <textarea value={cf.options} onChange={e => updateCustomField(cf._id, 'options', e.target.value)}
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                          rows={3}
                          style={{ ...inputSx, resize: 'vertical' }} />
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Toggle checked={cf.required} onChange={v => updateCustomField(cf._id, 'required', v)} />
                      <span style={{ fontSize: 12, color: '#374151' }}>Required field</span>
                    </div>
                  </div>
                ))}
                <button onClick={addCustomField}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '2px dashed #a5b4fc', background: '#f5f3ff', color: '#6366f1', fontWeight: 600, fontSize: 13, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                  <MdAdd size={16} /> Add Custom Field
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div>
          {/* Form Config */}
          <Card title="Form Status">
            <div style={rowSx}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>Form Status</div>
              </div>
              <Toggle checked={status} onChange={setStatus} />
            </div>
            <div style={{ ...rowSx, marginTop: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>Link to Lead</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Receive the inquiry in Leads also.</div>
              </div>
              <Toggle checked={linkToLead && fieldMode === 'predefined'} onChange={setLinkToLead} disabled={fieldMode === 'custom'} />
            </div>
            <div style={{ ...rowSx, marginTop: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>Registration Form</div>
              </div>
              <Toggle checked={registrationForm} onChange={setRegistrationForm} />
            </div>
            <div style={{ marginTop: 16 }}>
              <Label>Session</Label>
              <Input value={session} onChange={e => setSession(e.target.value)} placeholder="e.g. 2025–2026" />
            </div>
          </Card>

          {/* Email Config */}
          <Card title="Email Config">
            <div style={{ marginBottom: 12 }}>
              <Label>Receiver Email</Label>
              <Input value={receiverEmail} onChange={e => setReceiverEmail(e.target.value)} placeholder="admin@school.com" type="email" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Label>Email Subject</Label>
              <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="New Enquiry Received" />
            </div>
            <div>
              <Label>Email Signature</Label>
              <RichEditor value={emailSignature} onChange={setEmailSignature} placeholder="Your email signature…" height={80} />
            </div>
          </Card>

          {/* Auto Reply */}
          <Card title="Auto Reply">
            <div style={rowSx}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>Enable Auto Reply</span>
              <Toggle checked={autoReply} onChange={setAutoReply} />
            </div>
            {autoReply && (
              <div style={{ marginTop: 14 }}>
                <div style={{ marginBottom: 10 }}>
                  <Label>Reply Email Subject</Label>
                  <Input value={replySubject} onChange={e => setReplySubject(e.target.value)} placeholder="Thank you for your enquiry" />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <Label>Reply Email Body</Label>
                  <RichEditor value={replyBody} onChange={setReplyBody} placeholder="Dear applicant, Thank you…" height={90} />
                </div>
                <div>
                  <Label>Reply To Email</Label>
                  <Input value={replyTo} onChange={e => setReplyTo(e.target.value)} placeholder="noreply@school.com" type="email" />
                </div>
              </div>
            )}
          </Card>

          {/* Payment */}
          <Card title="Payment Settings">
            <div style={rowSx}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>Enable Payment</span>
              <Toggle checked={enablePayment} onChange={setEnablePayment} />
            </div>
            {enablePayment && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
                💳 Payment gateway integration can be configured in School Settings → Payment.
              </div>
            )}
          </Card>
        </div>
      </div>

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default CreateForm;
