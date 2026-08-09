import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetAllSchoolsQuery, useCreateSchoolMutation, useToggleSchoolStatusMutation, useDeleteSchoolMutation, useUpdateSchoolMutation } from '../api/superAdminApi';
import toast from 'react-hot-toast';
import { MdSearch, MdAdd, MdClose, MdVisibility, MdVisibilityOff, MdSchool, MdRefresh, MdChevronLeft, MdChevronRight, MdBlock, MdCheckCircle, MdSettings, MdDeleteForever, MdEdit } from 'react-icons/md';

// ── Shared field wrapper — defined at MODULE LEVEL so React never re-mounts inputs ──
const Field = ({ label, id, required, error, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label htmlFor={id} style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>
      {label}{required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
    </label>
    {children}
    {error && <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--color-danger)' }}>{error}</p>}
  </div>
);

// ── Create School Modal ───────────────────────────────────────────────────────
const CreateSchoolModal = ({ onClose, onCreate }) => {
  const [form, setForm]   = useState({ name:'', code:'', adminFirstName:'', adminLastName:'', adminEmail:'', adminPassword:'', address:'', phone:'' });
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const [createSchool, { isLoading }] = useCreateSchoolMutation();

  const set = (k) => (e) => {
    const v = k === 'code' ? e.target.value.toUpperCase() : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim())           errs.name           = 'Required';
    if (!form.code.trim())           errs.code           = 'Required';
    else if (!/^[A-Z0-9]{3,12}$/.test(form.code)) errs.code = '3–12 uppercase alphanumeric';
    if (!form.adminFirstName.trim()) errs.adminFirstName = 'Required';
    if (!form.adminLastName.trim())  errs.adminLastName  = 'Required';
    if (!form.adminEmail.trim())     errs.adminEmail     = 'Required';
    else if (!/\S+@\S+\.\S+/.test(form.adminEmail)) errs.adminEmail = 'Invalid email';
    if (!form.adminPassword)         errs.adminPassword  = 'Required';
    else if (form.adminPassword.length < 8) errs.adminPassword = 'Min 8 characters';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      const res = await createSchool(form).unwrap();
      toast.success(res.message || 'School created!');
      onCreate();
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create school');
    }
  };

  const iStyle = (hasErr) => ({
    width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 8,
    border: `1px solid ${hasErr ? 'var(--color-danger)' : 'var(--card-border)'}`,
    background: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none',
  });

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.4)' }} />
      <div style={{ position:'relative', width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto', background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, padding:24, boxShadow:'0 8px 32px rgba(0,0,0,0.15)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div>
            <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:'var(--text-primary)' }}>Add New School</h2>
            <p style={{ margin:'3px 0 0', fontSize:12, color:'var(--text-secondary)' }}>Creates school + admin user + default settings</p>
          </div>
          <button onClick={onClose} style={{ background:'var(--color-primary-light)', border:'none', borderRadius:7, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-secondary)' }}>
            <MdClose size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--color-primary)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>School Info</p>
          <Field label="School Name" id="cs-name" required error={errors.name}>
            <input id="cs-name" value={form.name} onChange={set('name')} placeholder="Sunrise Public School" style={iStyle(errors.name)} />
          </Field>
          <div style={{ display:'flex', gap:12 }}>
            <div style={{ flex:1 }}>
              <Field label="School Code" id="cs-code" required error={errors.code}>
                <input id="cs-code" value={form.code} onChange={set('code')} placeholder="SUNRISE01" maxLength={12} style={iStyle(errors.code)} />
              </Field>
            </div>
            <div style={{ flex:1 }}>
              <Field label="Phone" id="cs-phone">
                <input id="cs-phone" value={form.phone} onChange={set('phone')} placeholder="+91 98000 00000" style={iStyle(false)} />
              </Field>
            </div>
          </div>
          <Field label="Address" id="cs-address">
            <input id="cs-address" value={form.address} onChange={set('address')} placeholder="123 Main St, City" style={iStyle(false)} />
          </Field>

          <p style={{ fontSize:11, fontWeight:700, color:'var(--color-primary)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10, marginTop:4 }}>Admin Account</p>
          <div style={{ display:'flex', gap:12 }}>
            <div style={{ flex:1 }}>
              <Field label="First Name" id="cs-fn" required error={errors.adminFirstName}>
                <input id="cs-fn" value={form.adminFirstName} onChange={set('adminFirstName')} placeholder="Manish" style={iStyle(errors.adminFirstName)} />
              </Field>
            </div>
            <div style={{ flex:1 }}>
              <Field label="Last Name" id="cs-ln" required error={errors.adminLastName}>
                <input id="cs-ln" value={form.adminLastName} onChange={set('adminLastName')} placeholder="Sharma" style={iStyle(errors.adminLastName)} />
              </Field>
            </div>
          </div>
          <Field label="Admin Email" id="cs-email" required error={errors.adminEmail}>
            <input id="cs-email" type="email" value={form.adminEmail} onChange={set('adminEmail')} placeholder="admin@school.com" style={iStyle(errors.adminEmail)} />
          </Field>
          <Field label="Admin Password" id="cs-pw" required error={errors.adminPassword}>
            <div style={{ position:'relative' }}>
              <input id="cs-pw" type={showPass ? 'text' : 'password'} value={form.adminPassword} onChange={set('adminPassword')} placeholder="Min 8 characters" style={{ ...iStyle(errors.adminPassword), paddingRight:36 }} />
              <button type="button" onClick={() => setShowPass((p) => !p)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', padding:2 }}>
                {showPass ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
              </button>
            </div>
          </Field>

          <div style={{ display:'flex', gap:10, marginTop:20 }}>
            <button type="button" onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:8, background:'var(--color-primary-light)', border:'1px solid var(--card-border)', color:'var(--text-secondary)', cursor:'pointer', fontSize:14, fontWeight:600 }}>
              Cancel
            </button>
            <button type="submit" disabled={isLoading} style={{ flex:2, padding:'10px', borderRadius:8, background:'var(--color-primary)', border:'none', color:'#fff', cursor: isLoading ? 'not-allowed' : 'pointer', fontSize:14, fontWeight:700, opacity: isLoading ? 0.7 : 1 }}>
              {isLoading ? 'Creating…' : 'Create School'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Suspend Modal ─────────────────────────────────────────────────────────────
const SuspendModal = ({ school, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [error, setError]   = useState('');
  const [toggleStatus, { isLoading }] = useToggleSchoolStatusMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 10) { setError('Reason must be at least 10 characters'); return; }
    try {
      await toggleStatus({ id: school._id, action: 'suspend', reason }).unwrap();
      toast.success(`"${school.name}" suspended`);
      onConfirm();
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to suspend school');
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:110, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.4)' }} />
      <div style={{ position:'relative', width:'100%', maxWidth:420, background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, padding:24, boxShadow:'0 8px 32px rgba(0,0,0,0.15)' }}>
        <h2 style={{ margin:'0 0 6px', fontSize:17, fontWeight:700, color:'var(--text-primary)' }}>Suspend School</h2>
        <p style={{ margin:'0 0 14px', fontSize:13, color:'var(--text-secondary)' }}>This will block all logins for <strong>{school.name}</strong>.</p>

        <form onSubmit={handleSubmit}>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>
            Reason <span style={{ color:'var(--color-danger)' }}>*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(''); }}
            placeholder="Describe why this school is being suspended (min 10 chars)…"
            rows={3}
            style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px', fontSize:13, borderRadius:8, border:`1px solid ${error ? 'var(--color-danger)' : 'var(--card-border)'}`, background:'var(--card-bg)', color:'var(--text-primary)', outline:'none', resize:'vertical' }}
          />
          {error && <p style={{ margin:'4px 0 0', fontSize:11, color:'var(--color-danger)' }}>{error}</p>}

          <div style={{ display:'flex', gap:10, marginTop:18 }}>
            <button type="button" onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:8, background:'var(--color-primary-light)', border:'1px solid var(--card-border)', color:'var(--text-secondary)', cursor:'pointer', fontSize:14, fontWeight:600 }}>
              Cancel
            </button>
            <button type="submit" disabled={isLoading} style={{ flex:2, padding:'10px', borderRadius:8, background:'var(--color-danger)', border:'none', color:'#fff', cursor: isLoading ? 'not-allowed' : 'pointer', fontSize:14, fontWeight:700, opacity: isLoading ? 0.7 : 1 }}>
              {isLoading ? 'Suspending…' : 'Confirm Suspend'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Delete School Modal ───────────────────────────────────────────────────────
const DeleteSchoolModal = ({ school, onClose, onConfirm }) => {
  const [inputName, setInputName] = useState('');
  const [deleteSchool, { isLoading }] = useDeleteSchoolMutation();

  const handleDelete = async (e) => {
    e.preventDefault();
    if (inputName.trim() !== school.name.trim()) return;
    try {
      const res = await deleteSchool(school._id).unwrap();
      toast.success(res.message || `"${school.name}" deleted`);
      onConfirm();
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete school');
    }
  };

  const isMatch = inputName.trim() === school.name.trim();

  return (
    <div style={{ position:'fixed', inset:0, zIndex:120, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)' }} />
      <div style={{ position:'relative', width:'100%', maxWidth:440, background:'var(--card-bg)', border:'2px solid var(--color-danger)', borderRadius:12, padding:24, boxShadow:'0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <MdDeleteForever size={24} color="var(--color-danger)" />
          <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:'var(--color-danger)' }}>Delete School Permanently</h2>
        </div>
        <p style={{ margin:'0 0 6px', fontSize:13, color:'var(--text-secondary)' }}>
          This will <strong>permanently delete</strong> <strong style={{ color:'var(--text-primary)' }}>{school.name}</strong>, including all users, settings and data. <strong style={{ color:'var(--color-danger)' }}>This cannot be undone.</strong>
        </p>
        <p style={{ margin:'0 0 12px', fontSize:13, color:'var(--text-secondary)' }}>
          Type the school name to confirm:
        </p>
        <form onSubmit={handleDelete}>
          <input
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            placeholder={school.name}
            autoFocus
            style={{ width:'100%', boxSizing:'border-box', padding:'9px 11px', fontSize:13, borderRadius:8, border:`1px solid ${isMatch ? 'var(--color-danger)' : 'var(--card-border)'}`, background:'var(--card-bg)', color:'var(--text-primary)', outline:'none', marginBottom:14 }}
          />
          <div style={{ display:'flex', gap:10 }}>
            <button type="button" onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:8, background:'var(--color-primary-light)', border:'1px solid var(--card-border)', color:'var(--text-secondary)', cursor:'pointer', fontSize:14, fontWeight:600 }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isMatch || isLoading}
              style={{ flex:2, padding:'10px', borderRadius:8, background:'var(--color-danger)', border:'none', color:'#fff', cursor: (!isMatch || isLoading) ? 'not-allowed' : 'pointer', fontSize:14, fontWeight:700, opacity: (!isMatch || isLoading) ? 0.5 : 1 }}
            >
              {isLoading ? 'Deleting…' : 'Delete Permanently'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Edit School Modal ─────────────────────────────────────────────────────────
const EditSchoolModal = ({ school, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name:    school.name    || '',
    code:    school.code    || '',
    address: school.address || '',
    phone:   school.phone   || '',
    email:   school.email   || '',
  });
  const [errors, setErrors]           = useState({});
  const [updateSchool, { isLoading }] = useUpdateSchoolMutation();

  const set = (k) => (e) => {
    const v = k === 'code' ? e.target.value.toUpperCase() : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim())  errs.name = 'Required';
    if (!form.code.trim())  errs.code = 'Required';
    else if (!/^[A-Z0-9]{3,12}$/.test(form.code)) errs.code = '3–12 uppercase alphanumeric';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      const res = await updateSchool({ id: school._id, ...form }).unwrap();
      toast.success(res.message || 'School updated!');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update school');
    }
  };

  const iStyle = (hasErr) => ({
    width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 8,
    border: `1px solid ${hasErr ? 'var(--color-danger)' : 'var(--card-border)'}`,
    background: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none',
    boxSizing: 'border-box',
  });

  return (
    <div style={{ position:'fixed', inset:0, zIndex:115, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.4)' }} />
      <div style={{ position:'relative', width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto', background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, padding:24, boxShadow:'0 8px 32px rgba(0,0,0,0.15)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <MdEdit size={20} color="var(--color-primary)" />
            <div>
              <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:'var(--text-primary)' }}>Edit School</h2>
              <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--text-secondary)' }}>Update school information</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'var(--color-primary-light)', border:'none', borderRadius:7, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-secondary)' }}>
            <MdClose size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--color-primary)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>School Info</p>
          <Field label="School Name" id="es-name" required error={errors.name}>
            <input id="es-name" value={form.name} onChange={set('name')} placeholder="School name" style={iStyle(errors.name)} />
          </Field>
          <div style={{ display:'flex', gap:12 }}>
            <div style={{ flex:1 }}>
              <Field label="School Code" id="es-code" required error={errors.code}>
                <input id="es-code" value={form.code} onChange={set('code')} placeholder="e.g. SCH001" maxLength={12} style={iStyle(errors.code)} />
              </Field>
            </div>
            <div style={{ flex:1 }}>
              <Field label="Phone" id="es-phone">
                <input id="es-phone" value={form.phone} onChange={set('phone')} placeholder="+91 98000 00000" style={iStyle(false)} />
              </Field>
            </div>
          </div>
          <Field label="School Email" id="es-email" error={errors.email}>
            <input id="es-email" type="email" value={form.email} onChange={set('email')} placeholder="contact@school.com" style={iStyle(errors.email)} />
          </Field>
          <Field label="Address" id="es-address">
            <input id="es-address" value={form.address} onChange={set('address')} placeholder="123 Main St, City" style={iStyle(false)} />
          </Field>

          <div style={{ display:'flex', gap:10, marginTop:20 }}>
            <button type="button" onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:8, background:'var(--color-primary-light)', border:'1px solid var(--card-border)', color:'var(--text-secondary)', cursor:'pointer', fontSize:14, fontWeight:600 }}>
              Cancel
            </button>
            <button type="submit" disabled={isLoading} style={{ flex:2, padding:'10px', borderRadius:8, background:'var(--color-primary)', border:'none', color:'#fff', cursor: isLoading ? 'not-allowed' : 'pointer', fontSize:14, fontWeight:700, opacity: isLoading ? 0.7 : 1 }}>
              {isLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const SuperAdminSchools = () => {
  const navigate = useNavigate();
  const [searchInput, setSearchInput]         = useState('');
  const [searchTerm, setSearchTerm]           = useState('');
  const [statusFilter, setStatusFilter]       = useState('all');
  const [currentPage, setCurrentPage]         = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [suspendTarget, setSuspendTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget]       = useState(null);
  const [editTarget, setEditTarget]           = useState(null);
  const searchTimer = useRef(null);
  const LIMIT = 15;

  const handleSearchChange = (val) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearchTerm(val); setCurrentPage(1); }, 500);
  };
  useEffect(() => () => clearTimeout(searchTimer.current), []);

  const { data, isLoading, isFetching, refetch } = useGetAllSchoolsQuery({
    search: searchTerm, status: statusFilter, page: currentPage, limit: LIMIT,
  });
  const [toggleStatus] = useToggleSchoolStatusMutation();

  const schools    = data?.data?.schools    || [];
  const pagination = data?.data?.pagination || {};
  const totalPages = pagination.totalPages  || 1;

  const handleActivate = async (school) => {
    if (!window.confirm(`Activate "${school.name}"? This will restore all school user logins.`)) return;
    try {
      await toggleStatus({ id: school._id, action: 'activate' }).unwrap();
      toast.success(`"${school.name}" activated`);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to activate');
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="erp-page-title">Schools</h1>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:2 }}>
            {pagination.total !== undefined ? `${pagination.total} schools total` : 'Loading…'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:8, background:'var(--color-primary)', border:'none', color:'#fff', cursor:'pointer', fontSize:14, fontWeight:700 }}
        >
          <MdAdd size={18} /> Add School
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16, alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:220 }}>
          <MdSearch size={16} color="var(--text-secondary)" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)' }} />
          <input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name or code…"
            style={{ width:'100%', padding:'8px 32px 8px 32px', fontSize:13, borderRadius:8, border:'1px solid var(--card-border)', background:'var(--card-bg)', color:'var(--text-primary)', outline:'none' }}
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(''); setSearchTerm(''); }} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', padding:2 }}>
              <MdClose size={14} />
            </button>
          )}
        </div>

        {/* Status filter tabs */}
        <div style={{ display:'flex', gap:4, background:'var(--color-primary-light)', borderRadius:8, padding:3 }}>
          {[['all','All'],['active','Active'],['inactive','Suspended']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => { setStatusFilter(val); setCurrentPage(1); }}
              style={{ padding:'6px 14px', borderRadius:6, fontSize:13, fontWeight:600, cursor:'pointer', border:'none', transition:'all 0.15s', background: statusFilter===val ? 'var(--card-bg)' : 'transparent', color: statusFilter===val ? 'var(--color-primary)' : 'var(--text-secondary)', boxShadow: statusFilter===val ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}
            >
              {label}
            </button>
          ))}
        </div>

        <button onClick={() => refetch()} style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 12px', borderRadius:8, background:'var(--card-bg)', border:'1px solid var(--card-border)', color:'var(--text-secondary)', cursor:'pointer', fontSize:13 }}>
          <MdRefresh size={16} />
        </button>
      </div>

      {/* Table */}
      <div className="erp-section-card" style={{ padding:0, overflow:'hidden' }}>
        <div className="responsive-table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                {['School Name','Code','Admin Email','Users','Status','Created','Modules','Actions'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(isLoading || isFetching)
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j}>
                          <div style={{ height:14, width: j===0?'70%':j===7?'90%':'50%', borderRadius:4, background:'var(--color-card-border)', animation:'pulse 1.5s ease infinite' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : schools.length === 0
                  ? (
                    <tr>
                      <td colSpan={8} style={{ padding:'40px 20px', textAlign:'center' }}>
                        <MdSchool size={36} color="var(--text-muted)" style={{ display:'block', margin:'0 auto 10px' }} />
                        <div style={{ color:'var(--text-secondary)', fontSize:14 }}>
                          {searchTerm ? `No schools match "${searchTerm}"` : 'No schools found'}
                        </div>
                        {!searchTerm && (
                          <button onClick={() => setShowCreateModal(true)} style={{ marginTop:10, color:'var(--color-primary)', background:'none', border:'none', cursor:'pointer', fontWeight:600, fontSize:13 }}>
                            + Add the first school
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                  : schools.map((school) => (
                    <tr key={school._id}>
                      <td>
                        <div style={{ fontWeight:600 }}>{school.name}</div>
                        {school.email && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{school.email}</div>}
                      </td>
                      <td>
                        <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:600, background:'var(--color-primary-light)', color:'var(--color-primary)', padding:'2px 8px', borderRadius:5 }}>
                          {school.code}
                        </span>
                      </td>
                      <td style={{ fontSize:12, color:'var(--text-secondary)' }}>{school.adminUserId?.email || '—'}</td>
                      <td style={{ textAlign:'center' }}>{school.userCount ?? '—'}</td>
                      <td>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, background: school.isActive ? 'color-mix(in srgb,var(--color-success) 14%, white)' : 'color-mix(in srgb,var(--color-danger) 10%, white)', color: school.isActive ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          <span style={{ width:6, height:6, borderRadius:'50%', background: school.isActive ? 'var(--color-success)' : 'var(--color-danger)', display:'inline-block' }} />
                          {school.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td style={{ fontSize:12, color:'var(--text-secondary)', whiteSpace:'nowrap' }}>
                        {new Date(school.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                      </td>
                      {/* Modules button */}
                      <td>
                        <button
                          onClick={() => navigate(`/superadmin/schools/${school._id}/modules`)}
                          style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12, fontWeight:600, padding:'4px 11px', borderRadius:6, border:'1px solid var(--card-border)', background:'var(--color-primary-light)', color:'var(--color-primary)', cursor:'pointer', whiteSpace:'nowrap' }}
                        >
                          <MdSettings size={13} /> Modules
                        </button>
                      </td>
                      {/* Suspend / Activate + Edit + Delete */}
                      <td>
                        <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                          {school.isActive
                            ? (
                              <button
                                onClick={() => setSuspendTarget(school)}
                                style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:6, border:'1px solid color-mix(in srgb,var(--color-danger) 40%, transparent)', background:'color-mix(in srgb,var(--color-danger) 8%, white)', color:'var(--color-danger)', cursor:'pointer' }}
                              >
                                <MdBlock size={13} /> Suspend
                              </button>
                            )
                            : (
                              <button
                                onClick={() => handleActivate(school)}
                                style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:6, border:'1px solid color-mix(in srgb,var(--color-success) 40%, transparent)', background:'color-mix(in srgb,var(--color-success) 10%, white)', color:'var(--color-success)', cursor:'pointer' }}
                              >
                                <MdCheckCircle size={13} /> Activate
                              </button>
                            )
                          }
                          <button
                            onClick={() => setEditTarget(school)}
                            title="Edit school details"
                            style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:6, border:'1px solid color-mix(in srgb,var(--color-primary) 40%, transparent)', background:'color-mix(in srgb,var(--color-primary) 10%, white)', color:'var(--color-primary)', cursor:'pointer' }}
                          >
                            <MdEdit size={13} /> Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(school)}
                            title="Delete school permanently"
                            style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:6, border:'1px solid color-mix(in srgb,var(--color-danger) 50%, transparent)', background:'color-mix(in srgb,var(--color-danger) 12%, white)', color:'var(--color-danger)', cursor:'pointer' }}
                          >
                            <MdDeleteForever size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 18px', borderTop:'1px solid var(--card-border)', flexWrap:'wrap', gap:8 }}>
            <span style={{ fontSize:12, color:'var(--text-secondary)' }}>
              Page {currentPage} of {totalPages} · {pagination.total} schools
            </span>
            <div style={{ display:'flex', gap:5 }}>
              <button disabled={currentPage===1} onClick={() => setCurrentPage((p) => p-1)} style={{ display:'flex', alignItems:'center', gap:3, padding:'5px 10px', borderRadius:7, border:'1px solid var(--card-border)', background:'var(--card-bg)', color: currentPage===1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: currentPage===1 ? 'not-allowed' : 'pointer', fontSize:12 }}>
                <MdChevronLeft size={16} /> Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(currentPage-2, totalPages-4)) + i;
                return (
                  <button key={page} onClick={() => setCurrentPage(page)} style={{ width:32, height:32, borderRadius:7, fontSize:12, cursor:'pointer', border:'1px solid', borderColor: currentPage===page ? 'var(--color-primary)' : 'var(--card-border)', background: currentPage===page ? 'var(--color-primary)' : 'var(--card-bg)', color: currentPage===page ? '#fff' : 'var(--text-primary)', fontWeight: currentPage===page ? 700 : 400 }}>
                    {page}
                  </button>
                );
              })}
              <button disabled={currentPage===totalPages} onClick={() => setCurrentPage((p) => p+1)} style={{ display:'flex', alignItems:'center', gap:3, padding:'5px 10px', borderRadius:7, border:'1px solid var(--card-border)', background:'var(--card-bg)', color: currentPage===totalPages ? 'var(--text-muted)' : 'var(--text-primary)', cursor: currentPage===totalPages ? 'not-allowed' : 'pointer', fontSize:12 }}>
                Next <MdChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && <CreateSchoolModal onClose={() => setShowCreateModal(false)} onCreate={refetch} />}
      {suspendTarget   && <SuspendModal school={suspendTarget} onClose={() => setSuspendTarget(null)} onConfirm={refetch} />}
      {deleteTarget    && <DeleteSchoolModal school={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={refetch} />}
      {editTarget      && <EditSchoolModal school={editTarget} onClose={() => setEditTarget(null)} onSaved={refetch} />}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </>
  );
};

export default SuperAdminSchools;
