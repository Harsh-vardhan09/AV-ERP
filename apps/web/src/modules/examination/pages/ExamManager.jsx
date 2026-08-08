import React, { useState, useMemo } from 'react';
import {
  useGetExamsQuery, useCreateExamMutation, useDeleteExamMutation, useUpdateExamMutation,
  useGetExamSubjectsQuery, useRemoveExamSubjectMutation, useUpdateExamSubjectMutation,
  useGetClassesQuery, useGetClassSubjectsQuery, useGetActiveSessionQuery,
  useLinkTemplateToExamMutation, useGetAdminTemplatesQuery,
} from '../../../redux/api/adminApi';
import ConfirmModal from '@shared/ui/ConfirmModal';
import toast from 'react-hot-toast';

// ── Default preset distribution rows ──────────────────────────────────────────
const DEFAULT_DIST = [
  { type: 'theory', label: 'Theory', maxMarks: 100 },
];

// ── Custom Component Modal ────────────────────────────────────────────────────
const AddCustomModal = ({ existingTypes, onAdd, onClose }) => {
  const [label,    setLabel]    = React.useState('');
  const [maxMarks, setMaxMarks] = React.useState('');
  const [error,    setError]    = React.useState('');

  const handleAdd = () => {
    const trimmed = label.trim();
    if (!trimmed) { setError('Component name is required'); return; }
    const type = trimmed.toLowerCase().replace(/\s+/g, '_');
    if (existingTypes.includes(type)) { setError('This component already exists'); return; }
    const max = Number(maxMarks);
    if (!maxMarks || isNaN(max) || max < 0) { setError('Enter a valid max marks value'); return; }
    onAdd({ type, label: trimmed, maxMarks: max });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.5)'}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fadeIn">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">Add Custom Component</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          Define a new marks component (e.g. Viva, Assignment, Lab Work). Teachers will upload marks for this component separately.
        </p>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Component Name *</label>
            <input
              autoFocus
              value={label}
              onChange={e => { setLabel(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="e.g. Viva, Assignment, Lab Work"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Max Marks *</label>
            <input
              type="number" min="1"
              value={maxMarks}
              onChange={e => { setMaxMarks(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="e.g. 20"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <span>⚠</span> {error}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!label.trim() || !maxMarks}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            Add Component
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Marks Distribution Builder ────────────────────────────────────────────────
const MarksDistributionBuilder = ({ value = [], onChange }) => {
  const [showCustomModal, setShowCustomModal] = React.useState(false);

  const PRESETS = [
    { type: 'theory',    label: 'Theory',    emoji: '📝' },
    { type: 'practical', label: 'Practical',  emoji: '🔬' },
    { type: 'project',   label: 'Project',    emoji: '📁' },
    { type: 'internal',  label: 'Internal',   emoji: '📋' },
  ];

  const total = value.reduce((s, r) => s + (Number(r.maxMarks) || 0), 0);

  const addPreset = (preset) => {
    if (value.find(r => r.type === preset.type)) return;
    onChange([...value, { type: preset.type, label: preset.label, maxMarks: 0 }]);
  };

  const addCustom = (entry) => {
    onChange([...value, entry]);
  };

  const update = (idx, field, val) => {
    const next = [...value];
    next[idx] = { ...next[idx], [field]: field === 'maxMarks' ? Number(val) || 0 : val };
    onChange(next);
  };

  const remove = (idx) => onChange(value.filter((_, i) => i !== idx));

  return (
    <>
      {showCustomModal && (
        <AddCustomModal
          existingTypes={value.map(r => r.type)}
          onAdd={addCustom}
          onClose={() => setShowCustomModal(false)}
        />
      )}

      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Component</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide w-36">Max Marks</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {value.map((row, i) => (
              <tr key={row.type} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700 border border-indigo-200 whitespace-nowrap">
                      {row.type}
                    </span>
                    <input
                      value={row.label}
                      onChange={e => update(i, 'label', e.target.value)}
                      className="border rounded-lg px-2 py-1 text-sm flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number" min="0"
                    value={row.maxMarks}
                    onChange={e => update(i, 'maxMarks', e.target.value)}
                    className="border rounded-lg px-2 py-1 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    type="button" onClick={() => remove(i)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Remove"
                  >✕</button>
                </td>
              </tr>
            ))}
            {value.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-xs text-gray-400">
                  <div className="text-2xl mb-1">📋</div>
                  No components added yet. Use the buttons below to add mark types.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-gradient-to-r from-indigo-50 to-white border-t">
            <tr>
              <td className="px-3 py-2.5 text-xs text-gray-600 font-semibold">Total Max Marks</td>
              <td className="px-3 py-2.5">
                <span className={`text-sm font-bold ${total > 0 ? 'text-indigo-700' : 'text-gray-400'}`}>
                  {total > 0 ? total : '—'}
                </span>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        {/* Add Buttons */}
        <div className="p-3 flex flex-wrap gap-2 border-t bg-gray-50">
          <span className="text-xs text-gray-400 self-center mr-1">Add:</span>
          {PRESETS.map(p => {
            const added = !!value.find(r => r.type === p.type);
            return (
              <button
                key={p.type} type="button"
                disabled={added}
                onClick={() => addPreset(p)}
                className={`flex items-center gap-1 px-3 py-1 text-xs rounded-full border font-medium transition-all ${
                  added
                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed line-through'
                    : 'bg-white border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 text-gray-700'
                }`}
              >
                {p.emoji} {p.label}
                {added && <span className="ml-1 text-green-500">✓</span>}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            className="flex items-center gap-1 px-3 py-1 text-xs rounded-full border border-dashed font-medium bg-white border-indigo-400 text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            ✨ Custom…
          </button>
        </div>
      </div>
    </>
  );
};


const EXAM_TYPES_LIST = [
  { value: 'unit_test', label: 'Unit Test' },
  { value: 'quarterly', label: 'Quarterly Exam' },
  { value: 'half_yearly', label: 'Half Yearly' },
  { value: 'pre_board', label: 'Pre Board' },
  { value: 'annual', label: 'Annual / Final Exam' },
  { value: 'custom', label: 'Custom Exam' },
];

// ── Edit Exam Modal ───────────────────────────────────────────────────
const EditExamModal = ({ exam, onClose, onSave, loading }) => {
  const [name, setName]           = useState(exam?.name || '');
  const [type, setType]           = useState(exam?.type || 'half_yearly');
  const [description, setDesc]    = useState(exam?.description || '');
  const [startDate, setStart]     = useState(exam?.startDate ? exam.startDate.slice(0,10) : '');
  const [endDate, setEnd]         = useState(exam?.endDate   ? exam.endDate.slice(0,10)   : '');
  const [maxMarks, setMax]        = useState(exam?.maxMarks ?? 100);
  const [passingMarks, setPass]   = useState(exam?.passingMarks ?? 33);
  if (!exam) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.45)'}} onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Edit Exam</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Exam Name *</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Exam Type</label>
            <select value={type} onChange={e=>setType(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              {EXAM_TYPES_LIST.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input value={description} onChange={e=>setDesc(e.target.value)} placeholder="Optional" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={e=>setStart(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={e=>setEnd(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Max Marks</label>
            <input type="number" value={maxMarks} onChange={e=>setMax(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Pass Marks</label>
            <input type="number" value={passingMarks} onChange={e=>setPass(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex gap-3 mt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
          <button onClick={()=>onSave({name:name.trim(),type,description,startDate,endDate,maxMarks:+maxMarks,passingMarks:+passingMarks})} disabled={!name.trim()||loading} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">{loading?'Saving…':'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
};

// ── Edit Exam Subject Modal (with distribution editor) ────────────────────────
const EditExamSubjectModal = ({ es, onClose, onSave, loading }) => {
  const initDist = () => {
    if (Array.isArray(es?.marksDistribution) && es.marksDistribution.length > 0)
      return es.marksDistribution;
    const d = [{ type: 'theory', label: 'Theory', maxMarks: es?.maxMarks ?? 100 }];
    if ((es?.practicalMaxMarks || 0) > 0) d.push({ type: 'practical', label: 'Practical', maxMarks: es.practicalMaxMarks });
    if ((es?.projectMaxMarks   || 0) > 0) d.push({ type: 'project',   label: 'Project',   maxMarks: es.projectMaxMarks });
    return d;
  };
  const [dist, setDist]   = useState(initDist);
  const [pass, setPass]   = useState(es?.passingMarks ?? 33);
  if (!es) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.45)'}} onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-1">Edit Subject Marks Distribution</h3>
        <p className="text-xs text-gray-400 mb-4">{es.subjectId?.name} &mdash; {es.classId?.name}</p>
        <p className="text-xs text-gray-500 mb-2 font-medium">Marks Components</p>
        <div className="mb-4"><MarksDistributionBuilder value={dist} onChange={setDist} /></div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">Passing Marks (Total)</label>
          <input type="number" value={pass} onChange={e=>setPass(e.target.value)} className="w-32 border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
          <button
            onClick={() => onSave({
              marksDistribution: dist,
              maxMarks: dist.reduce((s,d)=>s+(Number(d.maxMarks)||0),0),
              passingMarks: +pass
            })}
            disabled={loading || dist.length === 0}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >{loading?'Saving…':'Save'}</button>
        </div>
      </div>
    </div>
  );
};

const EXAM_TYPES = EXAM_TYPES_LIST;

const ExamManager = () => {
  const { data: sessionData } = useGetActiveSessionQuery();
  const sessionId = sessionData?.data?._id;
  const { data: examData, isLoading: examsLoading, isError: examsError } = useGetExamsQuery({ session: sessionId }, { skip: !sessionId });
  const { data: classData } = useGetClassesQuery(sessionId, { skip: !sessionId });
  const { data: mappingData } = useGetClassSubjectsQuery({ session: sessionId }, { skip: !sessionId });
  const { data: templatesData } = useGetAdminTemplatesQuery({}, { skip: !sessionId });
  const [createExam, { isLoading: creating }] = useCreateExamMutation();
  const [deleteExam] = useDeleteExamMutation();
  const [updateExam, { isLoading: updatingExam }] = useUpdateExamMutation();
  const [removeExamSubject] = useRemoveExamSubjectMutation();
  const [updateExamSubject, { isLoading: updatingExamSubject }] = useUpdateExamSubjectMutation();
  const [linkTemplate, { isLoading: linkingTemplate }] = useLinkTemplateToExamMutation();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'half_yearly', description: '', scope: 'all',
    classIds: [], startDate: '', endDate: '', maxMarks: 100, passingMarks: 33,
    templateId: '',
  });
  // Marks distribution: 'same' = one distribution for all classes, 'perclass' = class-specific
  const [distMode,    setDistMode]    = useState('same');
  const [defaultDist, setDefaultDist] = useState(DEFAULT_DIST);
  // classWiseDist: { [classId]: [{type, label, maxMarks}] }
  const [classWiseDist, setClassWiseDist] = useState({});
  const setClassDist = (cid, val) => setClassWiseDist(prev => ({ ...prev, [cid]: val }));
  const getClassDist = (cid) => classWiseDist[cid] || defaultDist;
  const [selectedExam, setSelectedExam] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });
  const [editingExam, setEditingExam] = useState(null);
  const [editingExamSubject, setEditingExamSubject] = useState(null);

  const { data: examSubData } = useGetExamSubjectsQuery(
    { examId: selectedExam }, { skip: !selectedExam }
  );

  const exams = examData?.data || [];
  const classes = classData?.data || [];
  const mappings = mappingData?.data || [];
  const examSubjects = examSubData?.data || [];
  const templates = templatesData?.data || [];

  // Quick-link template handler called from exam card dropdown
  const handleLinkTemplate = async (examId, templateId) => {
    try {
      console.log('[ExamManager] Linking template', { examId, templateId });
      await linkTemplate({ examId, templateId: templateId || null }).unwrap();
      toast.success(templateId ? 'Template linked to exam ✅' : 'Template unlinked');
    } catch (err) { toast.error(err?.data?.message || 'Failed to link template'); }
  };

  // Group exam subjects by class
  const subjectsByClass = useMemo(() => {
    const grouped = {};
    examSubjects.forEach(es => {
      const cid = es.classId?._id;
      if (!grouped[cid]) grouped[cid] = { className: es.classId?.name, subjects: [] };
      grouped[cid].subjects.push(es);
    });
    return grouped;
  }, [examSubjects]);

  // Preview: subjects for selected classes
  const previewSubjects = useMemo(() => {
    const targetIds = form.scope === 'all' ? classes.map(c => c._id) : form.classIds;
    const grouped = {};
    targetIds.forEach(cid => {
      const classObj = classes.find(c => c._id === cid);
      const subs = mappings.filter(m => m.classId?._id === cid);
      if (classObj && subs.length > 0) {
        grouped[cid] = { className: classObj.name, subjects: subs };
      }
    });
    return grouped;
  }, [form.scope, form.classIds, classes, mappings]);

  const toggleClass = (cid) => {
    setForm(prev => ({
      ...prev,
      classIds: prev.classIds.includes(cid)
        ? prev.classIds.filter(id => id !== cid)
        : [...prev.classIds, cid]
    }));
  };

  const selectAll = () => setForm(prev => ({ ...prev, classIds: classes.map(c => c._id) }));

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, session: sessionId };
      if (form.scope === 'all') delete payload.classIds;
      if (!payload.templateId) delete payload.templateId;
      // Attach distribution
      if (distMode === 'same') {
        payload.defaultDistribution = defaultDist;
      } else {
        payload.classWiseDistribution = classWiseDist;
        payload.defaultDistribution   = defaultDist; // fallback for classes without override
      }
      // Derive legacy maxMarks from distribution total
      payload.maxMarks     = defaultDist.reduce((s, d) => s + (Number(d.maxMarks) || 0), 0) || 100;
      payload.passingMarks = form.passingMarks;
      const res = await createExam(payload).unwrap();
      toast.success(res.message);
      setForm({ name: '', type: 'half_yearly', description: '', scope: 'all', classIds: [], startDate: '', endDate: '', maxMarks: 100, passingMarks: 33, templateId: '' });
      setDefaultDist(DEFAULT_DIST);
      setClassWiseDist({});
      setDistMode('same');
      setShowForm(false);
    } catch (err) { toast.error(err?.data?.message || 'Error'); }
  };

  const handleDelete = (exam) => {
    setConfirmModal({
      open: true, title: 'Delete Exam',
      message: `Delete "${exam.name}"? All subject configs, marks, and audit logs will also be deleted.`,
      onConfirm: async () => {
        try {
          await deleteExam(exam._id).unwrap();
          toast.success('Exam deleted');
          if (selectedExam === exam._id) setSelectedExam(null);
        } catch (err) { toast.error(err?.data?.message || 'Error'); }
        setConfirmModal({ open: false });
      }
    });
  };

  const handleRemoveSubject = (es) => {
    setConfirmModal({
      open: true, title: 'Remove Subject',
      message: `Remove "${es.subjectId?.name}" from ${es.classId?.name}?`,
      onConfirm: async () => {
        try {
          await removeExamSubject(es._id).unwrap();
          toast.success('Subject removed');
        } catch (err) { toast.error(err?.data?.message || 'Error'); }
        setConfirmModal({ open: false });
      }
    });
  };

  const handleEditExam = (e, exam) => {
    e.stopPropagation();
    setEditingExam(exam);
  };

  const handleSaveEditExam = async (data) => {
    try {
      await updateExam({ id: editingExam._id, ...data }).unwrap();
      toast.success('Exam updated');
      setEditingExam(null);
    } catch (err) { toast.error(err?.data?.message || 'Failed to update exam'); }
  };

  const handleSaveEditExamSubject = async (data) => {
    try {
      await updateExamSubject({ id: editingExamSubject._id, ...data }).unwrap();
      toast.success('Marks updated');
      setEditingExamSubject(null);
    } catch (err) { toast.error(err?.data?.message || 'Failed to update'); }
  };

  if (!sessionId) return <div className="text-center py-12 text-gray-500">Activate a session first.</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Exam Management</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
          {showForm ? 'Cancel' : '+ Create Exam'}
        </button>
      </div>

      {/* Create Exam Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exam Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Half Yearly Exam 2025" required className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type *</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Marks</label>
                <input type="number" value={form.maxMarks} onChange={e => setForm({ ...form, maxMarks: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pass Marks</label>
                <input type="number" value={form.passingMarks} onChange={e => setForm({ ...form, passingMarks: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          {/* Class Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Classes</label>
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="scope" value="all" checked={form.scope === 'all'} onChange={() => setForm({ ...form, scope: 'all', classIds: [] })} className="text-indigo-600" />
                <span className="text-sm">All Classes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="scope" value="selected" checked={form.scope === 'selected'} onChange={() => setForm({ ...form, scope: 'selected' })} className="text-indigo-600" />
                <span className="text-sm">Selected Classes</span>
              </label>
            </div>
            {form.scope === 'selected' && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={selectAll} className="text-xs text-indigo-600 underline mr-2">Select All</button>
                {classes.map(c => (
                  <label key={c._id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${form.classIds.includes(c._id) ? 'bg-indigo-100 border-indigo-400 text-indigo-800' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={form.classIds.includes(c._id)} onChange={() => toggleClass(c._id)} className="sr-only" />
                    {c.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Subject Preview */}
          {Object.keys(previewSubjects).length > 0 && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">📋 Auto-mapped Subjects Preview</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(previewSubjects).map(([cid, info]) => (
                  <div key={cid} className="bg-white rounded-lg border p-3">
                    <div className="text-sm font-semibold text-indigo-600 mb-1">{info.className}</div>
                    {info.subjects.map(s => (
                      <div key={s._id} className="text-xs text-gray-500">• {s.subjectId?.name}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Marks Distribution ─────────────────────────────────────── */}
          <div className="mb-4 border rounded-xl p-4 bg-indigo-50">
            <h3 className="text-sm font-semibold text-indigo-800 mb-3">📊 Marks Distribution</h3>
            <p className="text-xs text-indigo-600 mb-3">
              Define how total marks are split (Theory, Practical, etc.). Teachers will upload marks for each component.
            </p>

            {/* Mode toggle */}
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" checked={distMode === 'same'}
                  onChange={() => setDistMode('same')} className="text-indigo-600" />
                Same for all classes
              </label>
              {Object.keys(previewSubjects).length > 1 && (
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" checked={distMode === 'perclass'}
                    onChange={() => setDistMode('perclass')} className="text-indigo-600" />
                Configure per class
                </label>
              )}
            </div>

            {distMode === 'same' && (
              <MarksDistributionBuilder value={defaultDist} onChange={setDefaultDist} />
            )}

            {distMode === 'perclass' && (
              <div className="space-y-4">
                {Object.entries(previewSubjects).map(([cid, info]) => (
                  <div key={cid}>
                    <p className="text-xs font-semibold text-indigo-700 mb-1">{info.className}</p>
                    <MarksDistributionBuilder
                      value={getClassDist(cid)}
                      onChange={val => setClassDist(cid, val)}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-3">
              <label className="text-xs font-medium text-gray-600">Passing Marks</label>
              <input
                type="number" min="0"
                value={form.passingMarks}
                onChange={e => setForm({ ...form, passingMarks: +e.target.value })}
                className="border rounded-lg px-3 py-1.5 text-sm w-24"
              />
            </div>
          </div>

          {/* ── Report Template Picker ──────────────────────────────── */}
          {templates.length > 0 && (
            <div className="mb-4 p-4 border border-green-200 rounded-xl bg-green-50">
              <h3 className="text-sm font-semibold text-green-800 mb-1">📄 Link Report Template <span className="font-normal text-green-600">(optional)</span></h3>
              <p className="text-xs text-green-700 mb-3">
                Select a template to drive the teacher marks-entry form and report generation. Teachers will see the template's fields automatically.
              </p>
              <select
                value={form.templateId}
                onChange={e => setForm({ ...form, templateId: e.target.value })}
                className="w-full border border-green-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option value="">— No template (legacy mode) —</option>
                {templates.map(t => (
                  <option key={t._id} value={t._id}>
                    {t.name}{t.isDefault ? ' ⭐ default' : ''} ({t.templateType})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" disabled={creating} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {creating ? 'Creating...' : 'Create Exam'}
          </button>
        </form>
      )}

      {/* Exams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exam List */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b"><h3 className="font-semibold text-gray-700">All Exams</h3></div>
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {exams.map(exam => (
              <div key={exam._id} onClick={() => setSelectedExam(exam._id)} className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedExam === exam._id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{exam.name}</h4>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">{exam.type?.replace('_', ' ')}</span>
                      {exam.evaluationStatus === 'pending' && <span className="px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-full text-xs font-medium">Pending</span>}
                      {exam.evaluationStatus === 'in_progress' && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-full text-xs font-medium">In Progress</span>}
                      {exam.evaluationStatus === 'completed' && <span className="px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded-full text-xs font-medium">Completed</span>}
                      {exam.createdByRole === 'teacher' && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Teacher Test</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Classes: {exam.classIds?.map(c => c.name).join(', ')}</p>
                    {exam.startDate && <p className="text-xs text-gray-400">{new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}</p>}
                    {/* Template badge / quick-link */}
                    <div className="mt-2 flex items-center gap-2">
                      {exam.templateId ? (
                        <span className="text-xs bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          📄 {exam.templateId?.name || 'Template linked'}
                        </span>
                      ) : (
                        <span className="text-xs bg-yellow-50 border border-yellow-200 text-yellow-600 px-2 py-0.5 rounded-full">
                          ⚠️ No template
                        </span>
                      )}
                      {templates.length > 0 && (
                        <select
                          value={exam.templateId?._id || exam.templateId || ''}
                          onChange={e => { e.stopPropagation(); handleLinkTemplate(exam._id, e.target.value); }}
                          onClick={e => e.stopPropagation()}
                          disabled={linkingTemplate}
                          className="text-xs border rounded-lg px-2 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 max-w-[180px]"
                          title="Link a report template to this exam"
                        >
                          <option value="">— link template —</option>
                          {templates.map(t => (
                            <option key={t._id} value={t._id}>
                              {t.name}{t.isDefault ? ' ⭐' : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  {!exam.evaluationLocked ? (
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <button onClick={(e) => handleEditExam(e, exam)} className="text-indigo-500 text-xs hover:text-indigo-700 font-medium">Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(exam); }} className="text-red-500 text-xs hover:text-red-700">Delete</button>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs ml-2 cursor-not-allowed" title="Locked: Evaluation Completed">Locked</span>
                  )}
                </div>
              </div>
            ))}
            {examsLoading && <p className="text-center py-8 text-gray-400">Loading exams...</p>}
            {examsError && <p className="text-center py-8 text-red-500 text-sm">Failed to load exams. Please refresh.</p>}
            {!examsLoading && !examsError && exams.length === 0 && (
              <p className="text-center py-8 text-gray-500">No exams yet. Click &quot;+ Create Exam&quot; to get started.</p>
            )}
          </div>
        </div>

        {/* Exam Subject Details */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b flex justify-between items-center">
            <h3 className="font-semibold text-gray-700">{selectedExam ? 'Exam Subjects (by Class)' : 'Select an exam'}</h3>
            {selectedExam && exams.find(e => e._id === selectedExam)?.evaluationLocked && (
               <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">Evaluation Locked</span>
            )}
          </div>
          {selectedExam && Object.entries(subjectsByClass).length > 0 ? (
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {Object.entries(subjectsByClass).map(([cid, info]) => (
                <div key={cid} className="p-4">
                  <h4 className="text-sm font-semibold text-indigo-600 mb-2">{info.className}</h4>
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-gray-400"><th className="text-left pb-1">Subject</th><th className="text-left pb-1">Distribution</th><th className="text-left pb-1">Pass</th><th></th></tr></thead>
                    <tbody>
                      {info.subjects.map(es => (
                        <tr key={es._id} className="border-t border-gray-100">
                          <td className="py-1.5">{es.subjectId?.name} <span className="text-gray-400 text-xs">({es.subjectId?.code})</span></td>
                          <td className="py-1.5">
                            {Array.isArray(es.marksDistribution) && es.marksDistribution.length > 0
                              ? es.marksDistribution.map(d => (
                                  <span key={d.type} className="inline-block mr-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-1.5 py-0.5">
                                    {d.label}: {d.maxMarks}
                                  </span>
                                ))
                              : <span className="text-gray-500">{es.maxMarks}</span>
                            }
                          </td>
                          <td className="py-1.5">{es.passingMarks}</td>
                          <td className="py-1.5">
                            {exams.find(e => e._id === selectedExam)?.evaluationLocked ? (
                              <span className="text-gray-400 text-xs cursor-not-allowed">Locked</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button onClick={() => setEditingExamSubject(es)} className="text-indigo-500 text-xs hover:text-indigo-700 font-medium">Edit</button>
                                <button onClick={() => handleRemoveSubject(es)} className="text-red-500 text-xs hover:text-red-700">Del</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : selectedExam ? (
            <p className="text-center py-8 text-gray-500">No subjects configured</p>
          ) : null}
        </div>
      </div>

      {editingExam && (
        <EditExamModal
          exam={editingExam}
          onClose={() => setEditingExam(null)}
          onSave={handleSaveEditExam}
          loading={updatingExam}
        />
      )}

      {editingExamSubject && (
        <EditExamSubjectModal
          es={editingExamSubject}
          onClose={() => setEditingExamSubject(null)}
          onSave={handleSaveEditExamSubject}
          loading={updatingExamSubject}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.open} title={confirmModal.title} message={confirmModal.message}
        onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal({ open: false })}
      />
    </div>
  );
};

export default ExamManager;
