import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MdArrowBack, MdSave, MdAdd, MdDelete, MdDragIndicator } from 'react-icons/md';
import toast from 'react-hot-toast';
import { useGetFormByIdQuery, useUpdateFormMutation, useGetPredefinedFieldsQuery } from '../../../redux/api/customFormApi';

const TOOLBAR_ACTIONS = [
  { cmd: 'bold', icon: 'B', style: { fontWeight: 700 } },
  { cmd: 'italic', icon: 'I', style: { fontStyle: 'italic' } },
  { cmd: 'underline', icon: 'U', style: { textDecoration: 'underline' } },
  { cmd: 'insertUnorderedList', icon: '• List', style: {} },
];
const RichEditor = ({ value, onChange, placeholder, height = 120 }) => {
  const ref = React.useRef(null);
  const exec = (cmd) => { document.execCommand(cmd, false, null); ref.current?.focus(); };
  const handleInput = () => { if (onChange) onChange(ref.current.innerHTML); };
  useEffect(() => { if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value || ''; }, []);
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 9, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 2, padding: '6px 8px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
        {TOOLBAR_ACTIONS.map(a => (
          <button key={a.cmd} type="button" onMouseDown={e => { e.preventDefault(); exec(a.cmd); }}
            style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, ...a.style }}>{a.icon}</button>
        ))}
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning onInput={handleInput}
        data-placeholder={placeholder}
        style={{ minHeight: height, padding: '10px 12px', fontSize: 13, outline: 'none', color: '#111' }} />
    </div>
  );
};

const Toggle = ({ checked, onChange, disabled }) => (
  <button type="button" disabled={disabled} onClick={() => !disabled && onChange(!checked)}
    style={{ width: 42, height: 24, borderRadius: 12, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', background: checked ? '#22c55e' : '#e5e7eb', position: 'relative', transition: 'background .25s', flexShrink: 0 }}>
    <span style={{ position: 'absolute', top: 3, left: checked ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .25s' }} />
  </button>
);

const Card = ({ title, children }) => (
  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 22, marginBottom: 18, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
    {title && <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: '0 0 16px', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>{title}</h3>}
    {children}
  </div>
);

const sx = { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const Label = ({ children, required }) => (
  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>{children}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}</label>
);
const Inp = ({ value, onChange, placeholder, type = 'text' }) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={sx} />
);

const EditForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: formData, isLoading: formLoading } = useGetFormByIdQuery(id);
  const { data: predefData } = useGetPredefinedFieldsQuery();
  const [updateForm, { isLoading: saving }] = useUpdateFormMutation();
  const ALL_PREDEFINED = predefData?.data || [];
  const form = formData?.data;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentPos, setContentPos] = useState('before');
  const [fieldMode, setFieldMode] = useState('predefined');
  const [predMap, setPredMap] = useState({});
  const [customFields, setCustomFields] = useState([]);
  const [status, setStatus] = useState(true);
  const [linkToLead, setLinkToLead] = useState(true);
  const [regForm, setRegForm] = useState(false);
  const [session, setSession] = useState('');
  const [recEmail, setRecEmail] = useState('');
  const [emailSub, setEmailSub] = useState('');
  const [emailSig, setEmailSig] = useState('');
  const [autoReply, setAutoReply] = useState(false);
  const [repSub, setRepSub] = useState('');
  const [repBody, setRepBody] = useState('');
  const [repTo, setRepTo] = useState('');
  const [payment, setPayment] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!form) return;
    setTitle(form.title || '');
    setContent(form.content || '');
    setContentPos(form.contentPosition || 'before');
    setFieldMode(form.fieldMode || 'predefined');
    setStatus(form.status ?? true);
    setLinkToLead(form.linkToLead ?? true);
    setRegForm(form.registrationForm ?? false);
    setSession(form.session || '');
    setRecEmail(form.receiverEmail || '');
    setEmailSub(form.emailSubject || '');
    setEmailSig(form.emailSignature || '');
    setAutoReply(form.autoReply ?? false);
    setRepSub(form.replyEmailSubject || '');
    setRepBody(form.replyEmailBody || '');
    setRepTo(form.replyToEmail || '');
    setPayment(form.enablePayment ?? false);
    const m = {};
    (form.predefinedFields || []).forEach(pf => { m[pf.fieldKey] = { enabled: pf.enabled, required: pf.required }; });
    setPredMap(m);
    setCustomFields((form.customFields || []).map((f, i) => ({ _id: i, label: f.label, fieldType: f.fieldType, options: (f.options || []).join('\n'), required: f.required })));
    setReady(true);
  }, [form]);

  const togglePred = (key, prop) => setPredMap(prev => ({ ...prev, [key]: { enabled: prop === 'enabled' ? !prev[key]?.enabled : (prev[key]?.enabled ?? false), required: prop === 'required' ? !prev[key]?.required : (prev[key]?.required ?? false) } }));
  const addCF = () => setCustomFields(prev => [...prev, { _id: Date.now(), label: '', fieldType: 'text', options: '', required: false }]);
  const updCF = (cid, k, v) => setCustomFields(prev => prev.map(f => f._id === cid ? { ...f, [k]: v } : f));
  const delCF = (cid) => setCustomFields(prev => prev.filter(f => f._id !== cid));

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    const predefinedFields = ALL_PREDEFINED.map((pf, idx) => ({ fieldName: pf.fieldName, fieldKey: pf.fieldKey, enabled: predMap[pf.fieldKey]?.enabled ?? false, required: predMap[pf.fieldKey]?.required ?? false, order: idx }));
    const cFields = customFields.map((f, idx) => ({ label: f.label, fieldType: f.fieldType, options: f.options ? f.options.split('\n').map(s => s.trim()).filter(Boolean) : [], required: f.required, order: idx }));
    try {
      await updateForm({ id, title, content, contentPosition: contentPos, fieldMode, predefinedFields, customFields: cFields, status, linkToLead, registrationForm: regForm, session, receiverEmail: recEmail, emailSubject: emailSub, emailSignature: emailSig, autoReply, replyEmailSubject: repSub, replyEmailBody: repBody, replyToEmail: repTo, enablePayment: payment }).unwrap();
      toast.success('Form updated!');
      navigate('/admin/custom-forms');
    } catch (err) { toast.error(err?.data?.message || 'Failed to update'); }
  };

  if (formLoading || !ready) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 13, color: '#6b7280' }}>Loading…</div>
      </div>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );

  const rowSx = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 };

  return (
    <div style={{ fontFamily: "'Inter',sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/admin/custom-forms')} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MdArrowBack size={18} /></button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: 0 }}>Edit Form</h1>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{form?.title}</p>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 9, border: 'none', background: saving ? '#a5b4fc' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}>
          <MdSave size={17} />{saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        <div>
          <Card><Label required>Title</Label><Inp value={title} onChange={e => setTitle(e.target.value)} placeholder="Form title" /></Card>
          <Card title="Content">
            <RichEditor value={content} onChange={setContent} placeholder="Instructions…" height={130} />
            <div style={{ marginTop: 14 }}>
              <Label>Content Position</Label>
              <select value={contentPos} onChange={e => setContentPos(e.target.value)} style={{ ...sx, width: 'auto', minWidth: 180 }}>
                <option value="before">Before Form</option><option value="after">After Form</option>
              </select>
            </div>
          </Card>
          <Card title="Form Fields">
            <div style={{ display: 'flex', borderRadius: 9, overflow: 'hidden', border: '1px solid #e5e7eb', marginBottom: 20, width: 'fit-content' }}>
              {['predefined','custom'].map(mode => (
                <button key={mode} onClick={() => setFieldMode(mode)} style={{ padding: '9px 28px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: fieldMode === mode ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#f8fafc', color: fieldMode === mode ? '#fff' : '#374151', transition: 'all .2s' }}>
                  {mode === 'predefined' ? 'Pre-defined Fields' : 'Custom Fields'}
                </button>
              ))}
            </div>
            {fieldMode === 'predefined' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px', gap: 8, padding: '8px 10px', background: '#f8fafc', borderRadius: 7, marginBottom: 8, fontSize: 12, fontWeight: 600, color: '#6b7280' }}>
                  <span>Field Name</span><span style={{ textAlign: 'center' }}>Enable</span><span style={{ textAlign: 'center' }}>Required</span>
                </div>
                {ALL_PREDEFINED.map(pf => {
                  const state = predMap[pf.fieldKey] || { enabled: false, required: false };
                  return (
                    <div key={pf.fieldKey} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px', gap: 8, alignItems: 'center', padding: '8px 10px', borderRadius: 7, marginBottom: 3, background: state.enabled ? '#fafbff' : '#fff', border: `1px solid ${state.enabled ? '#e0e7ff' : '#f1f5f9'}`, transition: 'all .15s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MdDragIndicator size={14} color="#d1d5db" /><span style={{ fontSize: 13, color: state.enabled ? '#4338ca' : '#374151', fontWeight: state.enabled ? 500 : 400 }}>{pf.fieldName}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}><Toggle checked={state.enabled} onChange={() => togglePred(pf.fieldKey, 'enabled')} /></div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}><Toggle checked={state.required} onChange={() => togglePred(pf.fieldKey, 'required')} disabled={!state.enabled} /></div>
                    </div>
                  );
                })}
              </>
            )}
            {fieldMode === 'custom' && (
              <div>
                {customFields.map((cf, idx) => (
                  <div key={cf._id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 10, background: '#fafbff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1' }}>Field {idx + 1}</span>
                      <button onClick={() => delCF(cf._id)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #fee2e2', background: '#fff5f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}><MdDelete size={13} /></button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div><Label>Label</Label><Inp value={cf.label} onChange={e => updCF(cf._id, 'label', e.target.value)} placeholder="Field label" /></div>
                      <div><Label>Type</Label>
                        <select value={cf.fieldType} onChange={e => updCF(cf._id, 'fieldType', e.target.value)} style={sx}>
                          {['text','textarea','number','email','tel','date','select','checkbox','radio','file'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                        </select>
                      </div>
                    </div>
                    {['select','radio','checkbox'].includes(cf.fieldType) && <div style={{ marginBottom: 10 }}><Label>Options (one per line)</Label><textarea value={cf.options} onChange={e => updCF(cf._id, 'options', e.target.value)} rows={3} style={{ ...sx, resize: 'vertical' }} /></div>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Toggle checked={cf.required} onChange={v => updCF(cf._id, 'required', v)} /><span style={{ fontSize: 12, color: '#374151' }}>Required field</span></div>
                  </div>
                ))}
                <button onClick={addCF} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '2px dashed #a5b4fc', background: '#f5f3ff', color: '#6366f1', fontWeight: 600, fontSize: 13, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                  <MdAdd size={16} />Add Custom Field
                </button>
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card title="Form Status">
            <div style={rowSx}><div><div style={{ fontSize: 13, fontWeight: 600 }}>Form Status</div></div><Toggle checked={status} onChange={setStatus} /></div>
            <div style={{ ...rowSx, marginTop: 14 }}>
              <div><div style={{ fontSize: 13, fontWeight: 600 }}>Link to Lead</div><div style={{ fontSize: 11, color: '#9ca3af' }}>Receive the inquiry in Leads also.</div></div>
              <Toggle checked={linkToLead && fieldMode === 'predefined'} onChange={setLinkToLead} disabled={fieldMode === 'custom'} />
            </div>
            <div style={{ ...rowSx, marginTop: 14 }}><div><div style={{ fontSize: 13, fontWeight: 600 }}>Registration Form</div></div><Toggle checked={regForm} onChange={setRegForm} /></div>
            <div style={{ marginTop: 16 }}><Label>Session</Label><Inp value={session} onChange={e => setSession(e.target.value)} placeholder="e.g. 2025–2026" /></div>
          </Card>
          <Card title="Email Config">
            <div style={{ marginBottom: 12 }}><Label>Receiver Email</Label><Inp value={recEmail} onChange={e => setRecEmail(e.target.value)} placeholder="admin@school.com" type="email" /></div>
            <div style={{ marginBottom: 12 }}><Label>Email Subject</Label><Inp value={emailSub} onChange={e => setEmailSub(e.target.value)} placeholder="New Enquiry Received" /></div>
            <div><Label>Email Signature</Label><RichEditor value={emailSig} onChange={setEmailSig} placeholder="Your signature…" height={80} /></div>
          </Card>
          <Card title="Auto Reply">
            <div style={rowSx}><span style={{ fontSize: 13, fontWeight: 600 }}>Enable Auto Reply</span><Toggle checked={autoReply} onChange={setAutoReply} /></div>
            {autoReply && (
              <div style={{ marginTop: 14 }}>
                <div style={{ marginBottom: 10 }}><Label>Reply Subject</Label><Inp value={repSub} onChange={e => setRepSub(e.target.value)} placeholder="Thank you for your enquiry" /></div>
                <div style={{ marginBottom: 10 }}><Label>Reply Body</Label><RichEditor value={repBody} onChange={setRepBody} placeholder="Dear applicant…" height={90} /></div>
                <div><Label>Reply To Email</Label><Inp value={repTo} onChange={e => setRepTo(e.target.value)} placeholder="noreply@school.com" type="email" /></div>
              </div>
            )}
          </Card>
          <Card title="Payment Settings">
            <div style={rowSx}><span style={{ fontSize: 13, fontWeight: 600 }}>Enable Payment</span><Toggle checked={payment} onChange={setPayment} /></div>
            {payment && <div style={{ marginTop: 10, padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e' }}>💳 Configure payment gateway in School Settings.</div>}
          </Card>
        </div>
      </div>
      <style>{`[contenteditable]:empty:before{content:attr(data-placeholder);color:#9ca3af;pointer-events:none;}`}</style>
    </div>
  );
};

export default EditForm;
