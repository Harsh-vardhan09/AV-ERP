import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useGetAllStudentsEnhancedQuery,
  useSoftDeleteStudentMutation,
  useMarkStudentPassedMutation,
  useMarkStudentDroppedMutation,
  useSuspendStudentMutation,
  useLazyExportStudentsQuery,
  useUploadStudentPhotoMutation,
} from '@modules/people/api/studentManagementApi';
import { useGetClassesQuery, useGetSectionsQuery, useGetSessionsQuery } from '../../../redux/api/adminApi';

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
const inputCls = "w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500";
const btn1 = "bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50";
const btn2 = "border border-gray-300 text-gray-600 px-4 py-1.5 rounded-md text-sm hover:bg-gray-50";

// Sortable column header
const SortTh = ({ label, field, sortBy, sortOrder, onSort, className = '', style = {} }) => {
  const active = sortBy === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={`px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap bg-gray-50 border-r border-gray-200 last:border-r-0 cursor-pointer select-none hover:bg-gray-100 transition-colors ${className}`}
      style={style}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-gray-${active ? '600' : '300'} text-[10px]`}>
          {active ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </span>
    </th>
  );
};

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  </div>
);

// ─── CSV helper ────────────────────────────────────────────────────────────────
const generateCSV = (students, total) => {
  const HEADERS = [
    'Sr.No.','Admission No.','Roll No.','Scholar No.','Full Name','Gender',
    'Date of Birth','Blood Group','Category','Religion',
    'Class','Section','Email','Phone','Address','City','State','Pincode',
    'Father Name','Father Phone','Father Email','Father Occupation',
    'Mother Name','Mother Phone','Status','Admission Date','Created At'
  ];
  const FIELDS = [
    'serial','admissionNumber','rollNo','scholarNo','fullName','gender',
    'dateOfBirth','bloodGroup','category','religion',
    'className','sectionName','email','phone','address','city','state','pincode',
    'fatherName','fatherPhone','fatherEmail','fatherOccupation',
    'motherName','motherPhone','status','admissionDate','createdAt'
  ];
  const escape = v => `"${String(v ?? '').replace(/"/g,'""')}"`;
  const rows = [
    [`Total Students: ${total}`],
    HEADERS.map(escape),
    ...students.map(s => FIELDS.map(f => escape(s[f])))
  ];
  return rows.map(r => r.join(',')).join('\n');
};

// ─── Export Modal ──────────────────────────────────────────────────────────────
const ExportModal = ({ onClose, allClasses }) => {
  const [expClass,    setExpClass]    = useState('');
  const [expSection,  setExpSection]  = useState('');
  const [expGender,   setExpGender]   = useState('');
  const [expCategory, setExpCategory] = useState('');
  const [sections, setSections]       = useState([]);
  const [fetchExport, { isLoading }]  = useLazyExportStudentsQuery();

  const handleClassChange = async (cid) => {
    setExpClass(cid); setExpSection('');
    // fetch sections for selected class from the class list
    setSections([]);
  };

  const selCls = "w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500";

  const handleDownload = async () => {
    try {
      const params = {};
      if (expClass)    params.classId    = expClass;
      if (expSection)  params.sectionId  = expSection;
      if (expGender)   params.gender     = expGender;
      if (expCategory) params.category   = expCategory;

      const res = await fetchExport(params).unwrap();
      const { students, total } = res.data;

      if (!students || students.length === 0) {
        toast('No students match the selected filters', { icon: 'ℹ️' });
        return;
      }

      const csv  = generateCSV(students, total);
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const date = new Date().toISOString().slice(0,10);
      a.href     = url;
      a.download = `students-${total}-${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${total} student record${total !== 1 ? 's' : ''}`);
      onClose();
    } catch (e) {
      toast.error(e?.data?.message || 'Export failed');
    }
  };

  const categories = ['General','OBC','SC','ST','EWS'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h3 className="font-semibold text-gray-900">Download Student List</h3>
            <p className="text-xs text-gray-500 mt-0.5">All filters optional — leave blank to download all</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-5 space-y-4">
          {/* Class */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
            <select value={expClass} onChange={e => handleClassChange(e.target.value)} className={selCls}>
              <option value="">All Classes</option>
              {allClasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          {/* Gender */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
            <select value={expGender} onChange={e => setExpGender(e.target.value)} className={selCls}>
              <option value="">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select value={expCategory} onChange={e => setExpCategory(e.target.value)} className={selCls}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-700">
            The CSV will include: Serial No., Admission No., Roll No., Name, Class, Section, Father/Mother details, DOB, Blood Group, Category, Status — sorted A to Z by name.
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-md text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleDownload} disabled={isLoading}
              className="flex-1 bg-green-600 text-white py-2 rounded-md text-sm hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Fetching…</>
                : <>↓ Download CSV</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Avatar = ({ s, onPhotoClick, isUploading }) => {
  const photo = s.documents?.photo;
  const initials = `${s.firstName?.[0] || ''}${s.lastName?.[0] || ''}`.toUpperCase();
  return (
    <div
      className="relative shrink-0 cursor-pointer group"
      onClick={onPhotoClick}
      title="Click to upload photo"
    >
      {isUploading ? (
        <div className="w-10 h-10 rounded-full border-2 border-blue-200 bg-blue-50 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : photo ? (
        <img src={photo} alt={initials} className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 group-hover:border-blue-400 transition-colors" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-sm font-bold group-hover:from-blue-600 group-hover:to-blue-800 transition-all">
          {initials}
        </div>
      )}
      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const map = { active:'bg-green-100 text-green-700', inactive:'bg-gray-100 text-gray-600', suspended:'bg-yellow-100 text-yellow-700', passed:'bg-blue-100 text-blue-700', dropped:'bg-orange-100 text-orange-700', deleted:'bg-red-100 text-red-700' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status]||'bg-gray-100 text-gray-600'}`}>{status}</span>;
};

const ActionMenu = ({ s, onAction, navigate }) => {
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);

  const open = (e) => {
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  };

  const groups = [
    [
      { label: 'View',                  fn: () => navigate(`/admin/students/${s._id}`) },
      { label: 'Edit',                  fn: () => navigate(`/admin/students/${s._id}/edit`) },
    ],
    [
      { label: 'View Fees / Structure', fn: () => navigate(`/admin/fee?student=${s._id}`) },
      { label: 'Collect Fees',          fn: () => navigate(`/admin/fee?student=${s._id}&action=collect`) },
      //  { label: 'View Attendance',       fn: () => navigate(`/admin/students/${s._id}`) },
      { label: 'Create TC',             fn: () => navigate(`/admin/documents?student=${s._id}&type=tc`) },
    ],
    [
      { label: 'Mark as Passed',  fn: () => onAction('pass',    s) },
      { label: 'Mark as Dropped', fn: () => onAction('drop',    s) },
      { label: 'Suspend',         fn: () => onAction('suspend', s) },
      { label: 'Delete',          fn: () => onAction('delete',  s), red: true },
    ],
  ];

  return (
    <>
      <button ref={btnRef} onClick={open}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z"/>
        </svg>
      </button>

      {pos && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setPos(null)} />
          <div className="fixed z-40 bg-white border border-gray-200 rounded-xl shadow-xl w-52 py-1 text-sm"
            style={{ top: pos.top, right: pos.right }}>
            {groups.map((group, gi) => (
              <div key={gi}>
                {gi > 0 && <div className="my-1 border-t border-gray-100" />}
                {group.map(item => (
                  <button key={item.label}
                    onClick={() => { setPos(null); item.fn(); }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                      item.red ? 'text-red-600' : 'text-gray-700'
                    }`}>
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
};

export default function AllStudents() {
  const navigate = useNavigate();
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [classId, setClassId]               = useState('');
  const [sectionId, setSectionId]           = useState('');
  const [sessionId, setSessionId]           = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [genderFilter, setGenderFilter]     = useState('');
  const [sortBy, setSortBy]                 = useState('firstName');
  const [sortOrder, setSortOrder]           = useState('asc');
  const [selected, setSelected]             = useState(new Set());

  const [modal, setModal]             = useState(null);
  const [showExport, setShowExport]   = useState(false);
  const [passedForm, setPassedForm]   = useState({ passedOutYear:'', passedOutClass:'' });
  const [droppedForm, setDroppedForm] = useState({ dropReason:'', droppedDate:'' });
  const [suspendForm, setSuspendForm] = useState({ suspensionReason:'', suspendedFrom:'', suspendedUntil:'' });
  const [deleteForm, setDeleteForm]   = useState({ reason:'', confirmed:false });

  const debounceRef = useRef(null);
  const handleSearch = v => { setSearchInput(v); clearTimeout(debounceRef.current); debounceRef.current = setTimeout(() => { setSearch(v); setPage(1); }, 500); };

  // ── Photo upload ─────────────────────────────────────────────────────────────
  const photoInputRef    = useRef(null);
  const pendingStudentRef = useRef(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [uploadStudentPhoto] = useUploadStudentPhotoMutation();

  const handlePhotoClick = (student) => {
    pendingStudentRef.current = student;
    photoInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file    = e.target.files?.[0];
    const student = pendingStudentRef.current;
    if (!file || !student) return;
    const formData = new FormData();
    formData.append('photo', file);
    setUploadingId(student._id);
    try {
      await uploadStudentPhoto({ id: student._id, formData }).unwrap();
      toast.success('Photo updated successfully');
    } catch (err) {
      toast.error(err?.data?.message || 'Photo upload failed');
    } finally {
      setUploadingId(null);
      pendingStudentRef.current = null;
      e.target.value = '';
    }
  };

  const { data, isLoading } = useGetAllStudentsEnhancedQuery({
    page, limit: 20, search,
    classId, sectionId,
    session: sessionId,
    gender: genderFilter,
    category: categoryFilter,
    sortBy, sortOrder,
  });
  const { data: sessionsData } = useGetSessionsQuery();
  const sessions = sessionsData?.data || [];
  const { data: classData }   = useGetClassesQuery();
  const { data: sectionData } = useGetSectionsQuery({ classId }, { skip: !classId });

  const [softDelete,  { isLoading: isDeleting  }] = useSoftDeleteStudentMutation();
  const [markPassed,  { isLoading: isPassing   }] = useMarkStudentPassedMutation();
  const [markDropped, { isLoading: isDropping  }] = useMarkStudentDroppedMutation();
  const [suspend,     { isLoading: isSuspending}] = useSuspendStudentMutation();

  const students   = data?.data?.students   || [];
  const pagination = data?.data?.pagination || {};
  const classes    = classData?.data   || [];
  const sections   = sectionData?.data || [];

  const allSel = students.length > 0 && students.every(s => selected.has(s._id));
  const toggleAll = () => { const n = new Set(selected); allSel ? students.forEach(s=>n.delete(s._id)) : students.forEach(s=>n.add(s._id)); setSelected(n); };
  const toggleOne = id => { const n = new Set(selected); n.has(id)?n.delete(id):n.add(id); setSelected(n); };

  const closeModal = () => { setModal(null); setPassedForm({passedOutYear:'',passedOutClass:''}); setDroppedForm({dropReason:'',droppedDate:''}); setSuspendForm({suspensionReason:'',suspendedFrom:'',suspendedUntil:''}); setDeleteForm({reason:'',confirmed:false}); };

  const handleDelete = async () => {
    if (!deleteForm.confirmed) return toast.error('Tick the confirmation box');
    try { await softDelete({ id:modal.student._id, reason:deleteForm.reason }).unwrap(); toast.success('Student deleted'); closeModal(); } catch(e) { toast.error(e?.data?.message||'Error'); }
  };
  const handleMarkPassed = async () => {
    if (!passedForm.passedOutYear) return toast.error('Year required');
    try { await markPassed({ id:modal.student._id, ...passedForm }).unwrap(); toast.success('Marked passed'); closeModal(); } catch(e) { toast.error(e?.data?.message||'Error'); }
  };
  const handleMarkDropped = async () => {
    if (!droppedForm.dropReason) return toast.error('Reason required');
    try { await markDropped({ id:modal.student._id, ...droppedForm }).unwrap(); toast.success('Marked dropped'); closeModal(); } catch(e) { toast.error(e?.data?.message||'Error'); }
  };
  const handleSuspend = async () => {
    if (!suspendForm.suspensionReason||!suspendForm.suspendedUntil) return toast.error('All fields required');
    try { await suspend({ id:modal.student._id, ...suspendForm }).unwrap(); toast.success('Suspended'); closeModal(); } catch(e) { toast.error(e?.data?.message||'Error'); }
  };

  const th = "px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap bg-slate-50 border-r border-slate-200/80 last:border-r-0";
  const td = "px-3 py-3 text-sm align-middle border-r border-slate-100 last:border-r-0";

  return (
    <div className="max-w-7xl mx-auto space-y-4 px-2 sm:px-4 pb-12">
      {/* Hidden file input for photo upload */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900">All Students</h1>
          <p className="text-xs text-slate-500 mt-0.5">Total Records: <strong className="text-slate-800 tabular-nums">{pagination.total ?? 0}</strong></p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Download button */}
          <button onClick={() => setShowExport(true)}
            className="inline-flex items-center gap-1.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer">
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            <span>Export List</span>
          </button>
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px] sm:w-64">
            <input value={searchInput} onChange={e => handleSearch(e.target.value)}
              placeholder="Search student, roll, admin no…"
              className="w-full border border-slate-200/80 bg-white rounded-xl pl-8 pr-7 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-slate-400 shadow-xs" />
            <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            {search && (
              <button onClick={()=>{setSearch('');setSearchInput('');}} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">×</button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs grid grid-cols-2 sm:grid-cols-6 gap-2.5 items-center">
        {/* Session */}
        <select value={sessionId} onChange={e=>{setSessionId(e.target.value);setPage(1);}}
          className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400">
          <option value="">All Sessions</option>
          {sessions.map(s=><option key={s._id} value={s._id}>{s.name} {s.isActive ? '(Active)' : ''}</option>)}
        </select>
        {/* Class */}
        <select value={classId} onChange={e=>{setClassId(e.target.value);setSectionId('');setPage(1);}}
          className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400">
          <option value="">All Classes</option>
          {classes.map(c=><option key={c._id} value={c._id}>Class {c.name}</option>)}
        </select>
        {/* Section */}
        <select value={sectionId} onChange={e=>{setSectionId(e.target.value);setPage(1);}} disabled={!classId}
          className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400 disabled:opacity-50">
          <option value="">All Sections</option>
          {sections.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        {/* Gender */}
        <select value={genderFilter} onChange={e=>{setGenderFilter(e.target.value);setPage(1);}}
          className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400">
          <option value="">All Genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        {/* Category */}
        <select value={categoryFilter} onChange={e=>{setCategoryFilter(e.target.value);setPage(1);}}
          className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400">
          <option value="">All Categories</option>
          {['General','OBC','SC','ST','EWS'].map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        {/* Sort */}
        <div className="flex items-center gap-1 col-span-2 sm:col-span-1">
          <select value={sortBy} onChange={e=>{setSortBy(e.target.value);setPage(1);}}
            className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400">
            <option value="firstName">Name</option>
            <option value="rollNo">Roll No</option>
            <option value="admissionNumber">Admin No</option>
            <option value="createdAt">Recent</option>
          </select>
          <button
            onClick={()=>setSortOrder(o=>o==='asc'?'desc':'asc')}
            title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
            className="border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="flex justify-center py-14"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"/></div>
        ) : students.length === 0 ? (
          <div className="text-center py-14 text-slate-400">
            <p className="text-xs font-medium">No students found</p>
          </div>
        ) : (
          <>
            {/* Mobile Card List View (Phone Viewport) */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {students.map((s) => (
                <div key={s._id} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar s={s} onPhotoClick={() => handlePhotoClick(s)} isUploading={uploadingId === s._id} />
                      <div>
                        <button onClick={()=>navigate(`/admin/students/${s._id}`)} className="font-bold text-xs text-slate-900 hover:text-indigo-600 text-left block">
                          {s.fullName || `${s.firstName} ${s.lastName}`}
                        </button>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {s.className || 'Unassigned'}{s.sectionName ? ` — ${s.sectionName}` : ''}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={s.status}/>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>Admin: <strong className="text-slate-800">{s.admissionNumber || '—'}</strong></span>
                    <span>Roll: <strong className="text-slate-800">{s.rollNo || '—'}</strong></span>
                    <button
                      onClick={()=>navigate(`/admin/students/${s._id}`)}
                      className="text-xs font-bold text-indigo-600"
                    >
                      View →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto" style={{overflowY:'visible'}}>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className={th} style={{width:36}}><input type="checkbox" checked={allSel} onChange={toggleAll} className="accent-indigo-600"/></th>
                    <th className={th} style={{width:40}}>#</th>
                    <SortTh label="Admission No." field="admissionNumber" sortBy={sortBy} sortOrder={sortOrder} onSort={f=>{setSortBy(f);setSortOrder(o=> sortBy===f ? (o==='asc'?'desc':'asc') : 'asc');setPage(1);}} />
                    <SortTh label="Roll No."      field="rollNo"          sortBy={sortBy} sortOrder={sortOrder} onSort={f=>{setSortBy(f);setSortOrder(o=> sortBy===f ? (o==='asc'?'desc':'asc') : 'asc');setPage(1);}} />
                    <SortTh label="Student"       field="firstName"       sortBy={sortBy} sortOrder={sortOrder} onSort={f=>{setSortBy(f);setSortOrder(o=> sortBy===f ? (o==='asc'?'desc':'asc') : 'asc');setPage(1);}} style={{minWidth:200}} />
                    <th className={th}>Class / Section</th>
                    <th className={th} style={{minWidth:140}}>Father Details</th>
                    <th className={th} style={{minWidth:120}}>Mother Details</th>
                    <SortTh label="DOB / Gender" field="dateOfBirth" sortBy={sortBy} sortOrder={sortOrder} onSort={f=>{setSortBy(f);setSortOrder(o=> sortBy===f ? (o==='asc'?'desc':'asc') : 'asc');setPage(1);}} />
                    <th className={th}>Status</th>
                    <th className={th} style={{width:48}}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {students.map((s, idx) => (
                    <tr key={s._id} className={`hover:bg-slate-50/50 transition-colors ${selected.has(s._id)?'bg-indigo-50/30':''}`}>
                      <td className={td}>
                        <input type="checkbox" checked={selected.has(s._id)} onChange={()=>toggleOne(s._id)} className="accent-indigo-600"/>
                      </td>
                      <td className={`${td} text-slate-400 text-[11px]`}>{(page-1)*20+idx+1}</td>

                      <td className={td}>
                        <span className="font-semibold text-slate-800">{s.admissionNumber || '—'}</span>
                      </td>

                      <td className={`${td} font-semibold text-slate-800`}>{s.rollNo || '—'}</td>

                      <td className={td}>
                        <div className="flex items-center gap-2">
                          <Avatar
                            s={s}
                            onPhotoClick={() => handlePhotoClick(s)}
                            isUploading={uploadingId === s._id}
                          />
                          <div>
                            <button onClick={()=>navigate(`/admin/students/${s._id}`)}
                              className="font-bold text-slate-900 hover:text-indigo-600 text-left leading-tight block">
                              {s.fullName || `${s.firstName} ${s.lastName}`}
                            </button>
                            <div className="text-[11px] text-slate-400">{s.email || '—'}</div>
                          </div>
                        </div>
                      </td>

                      <td className={td}>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-semibold border border-slate-200/80">
                          {s.className || '—'}{s.sectionName ? ` — ${s.sectionName}` : ''}
                        </span>
                      </td>

                      <td className={td}>
                        <div className="text-[11px]">
                          <div className="font-semibold text-slate-800">{s.parentDetails?.father?.name || s.parentName || '—'}</div>
                          <div className="text-slate-400">{s.parentDetails?.father?.phone || s.parentPhone || ''}</div>
                        </div>
                      </td>

                      <td className={td}>
                        <div className="text-[11px]">
                          <div className="font-semibold text-slate-800">{s.parentDetails?.mother?.name || '—'}</div>
                          <div className="text-slate-400">{s.parentDetails?.mother?.phone || ''}</div>
                        </div>
                      </td>

                      <td className={td}>
                        <div className="text-[11px] text-slate-700">{s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('en-IN') : '—'}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{s.gender || '—'}</div>
                      </td>

                      <td className={td}><StatusBadge status={s.status}/></td>

                      <td className={td}>
                        <ActionMenu s={s} navigate={navigate} onAction={(type, student) => setModal({type, student})} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500 font-medium">Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-xs cursor-pointer">← Prev</button>
              <button onClick={()=>setPage(p=>Math.min(pagination.totalPages,p+1))} disabled={page===pagination.totalPages}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-xs cursor-pointer">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}
      {modal?.type === 'pass' && (
        <Modal title={`Mark as Passed — ${modal.student.firstName} ${modal.student.lastName}`} onClose={closeModal}>
          <div className="space-y-3">
            <div><label className="text-xs text-gray-500 block mb-1">Passed Out Year *</label>
              <input value={passedForm.passedOutYear} onChange={e=>setPassedForm(f=>({...f,passedOutYear:e.target.value}))} placeholder="e.g. 2024-25" className={inputCls}/></div>
            <div><label className="text-xs text-gray-500 block mb-1">Passed Out Class</label>
              <input value={passedForm.passedOutClass} onChange={e=>setPassedForm(f=>({...f,passedOutClass:e.target.value}))} placeholder="e.g. Class 12" className={inputCls}/></div>
            <div className="flex gap-2 pt-2">
              <button onClick={closeModal} className={btn2}>Cancel</button>
              <button onClick={handleMarkPassed} disabled={isPassing} className={btn1}>{isPassing?'Saving…':'Mark as Passed'}</button>
            </div>
          </div>
        </Modal>
      )}

      {modal?.type === 'drop' && (
        <Modal title={`Mark as Dropped — ${modal.student.firstName} ${modal.student.lastName}`} onClose={closeModal}>
          <div className="space-y-3">
            <div><label className="text-xs text-gray-500 block mb-1">Drop Reason *</label>
              <textarea value={droppedForm.dropReason} onChange={e=>setDroppedForm(f=>({...f,dropReason:e.target.value}))} rows={3} className={inputCls+' resize-none'}/></div>
            <div><label className="text-xs text-gray-500 block mb-1">Drop Date</label>
              <input type="date" value={droppedForm.droppedDate} onChange={e=>setDroppedForm(f=>({...f,droppedDate:e.target.value}))} className={inputCls}/></div>
            <div className="flex gap-2 pt-2">
              <button onClick={closeModal} className={btn2}>Cancel</button>
              <button onClick={handleMarkDropped} disabled={isDropping} className={btn1}>{isDropping?'Saving…':'Mark as Dropped'}</button>
            </div>
          </div>
        </Modal>
      )}

      {modal?.type === 'suspend' && (
        <Modal title={`Suspend — ${modal.student.firstName} ${modal.student.lastName}`} onClose={closeModal}>
          <div className="space-y-3">
            <div><label className="text-xs text-gray-500 block mb-1">Reason *</label>
              <textarea value={suspendForm.suspensionReason} onChange={e=>setSuspendForm(f=>({...f,suspensionReason:e.target.value}))} rows={3} className={inputCls+' resize-none'}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-500 block mb-1">From</label>
                <input type="date" value={suspendForm.suspendedFrom} onChange={e=>setSuspendForm(f=>({...f,suspendedFrom:e.target.value}))} className={inputCls}/></div>
              <div><label className="text-xs text-gray-500 block mb-1">Until *</label>
                <input type="date" value={suspendForm.suspendedUntil} onChange={e=>setSuspendForm(f=>({...f,suspendedUntil:e.target.value}))} className={inputCls}/></div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={closeModal} className={btn2}>Cancel</button>
              <button onClick={handleSuspend} disabled={isSuspending} className={btn1}>{isSuspending?'Saving…':'Suspend'}</button>
            </div>
          </div>
        </Modal>
      )}

      {modal?.type === 'delete' && (
        <Modal title={`Delete — ${modal.student.firstName} ${modal.student.lastName}`} onClose={closeModal}>
          <div className="space-y-3">
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
              Soft delete — student can be restored from Deleted Students section.
            </p>
            <div><label className="text-xs text-gray-500 block mb-1">Reason</label>
              <textarea value={deleteForm.reason} onChange={e=>setDeleteForm(f=>({...f,reason:e.target.value}))} rows={3} className={inputCls+' resize-none'}/></div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={deleteForm.confirmed} onChange={e=>setDeleteForm(f=>({...f,confirmed:e.target.checked}))} className="accent-red-500"/>
              I confirm this action
            </label>
            <div className="flex gap-2 pt-2">
              <button onClick={closeModal} className={btn2}>Cancel</button>
              <button onClick={handleDelete} disabled={isDeleting||!deleteForm.confirmed}
                className="bg-red-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-red-700 disabled:opacity-50">
                {isDeleting?'Deleting…':'Delete Student'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Export Modal */}
      {showExport && (
        <ExportModal onClose={() => setShowExport(false)} allClasses={classes} />
      )}
    </div>
  );
}
