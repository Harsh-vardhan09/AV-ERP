import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  useGetECActiveSessionQuery, useGetECAllExamsQuery, useGetECClassesQuery,
  useGetECExamSubjectsQuery, useCreateECExamMutation, useUpdateECExamMutation,
  useDeleteECExamMutation, useUpdateECExamSubjectMutation, useRemoveECExamSubjectMutation,
  useLinkECTemplateToExamMutation, useGetECTemplatesQuery,
} from '../api/examControllerApi';

/* ── helpers ── */
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const statusStyle = s => ({ published:{bg:'#f0fdf4',c:'#166534'}, upcoming:{bg:'#eff6ff',c:'#1d4ed8'}, ongoing:{bg:'#fefce8',c:'#92400e'}, completed:{bg:'#f8fafc',c:'#475569'} })[s?.toLowerCase()] || {bg:'#f8fafc',c:'#94a3b8'};
const EXAM_TYPES = [{v:'unit_test',l:'Unit Test'},{v:'quarterly',l:'Quarterly'},{v:'half_yearly',l:'Half Yearly'},{v:'pre_board',l:'Pre Board'},{v:'annual',l:'Annual / Final'},{v:'custom',l:'Custom'}];
const iStyle = { width:'100%', border:'1.5px solid #e2e8f0', borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none', boxSizing:'border-box' };
const lStyle = { fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' };

/* ── Confirm modal ── */
const Confirm = ({ msg, onOk, onCancel }) => (
  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
    <div style={{background:'#fff',borderRadius:16,padding:28,maxWidth:400,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
      <p style={{margin:'0 0 20px',fontSize:14,color:'#1e293b'}}>{msg}</p>
      <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
        <button onClick={onCancel} style={{padding:'8px 18px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',cursor:'pointer',fontSize:13}}>Cancel</button>
        <button onClick={onOk} style={{padding:'8px 18px',borderRadius:8,border:'none',background:'#ef4444',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600}}>Delete</button>
      </div>
    </div>
  </div>
);

/* ── Edit Exam Modal ── */
const EditModal = ({ exam, onClose, onSave, loading }) => {
  const [f, setF] = useState({ name:exam.name||'', type:exam.type||'half_yearly', description:exam.description||'', startDate:exam.startDate?.slice(0,10)||'', endDate:exam.endDate?.slice(0,10)||'', maxMarks:exam.maxMarks??100, passingMarks:exam.passingMarks??33 });
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:'#fff',borderRadius:16,padding:28,maxWidth:480,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:700}}>Edit Exam</h3>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#94a3b8'}}>✕</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
          {[['Exam Name','name','text',2],['Exam Type','type','select',1],['Description','description','text',1],['Start Date','startDate','date',1],['End Date','endDate','date',1],['Max Marks','maxMarks','number',1],['Pass Marks','passingMarks','number',1]].map(([label,key,type,span]) => (
            <div key={key} style={{gridColumn:`span ${span}`}}>
              <label style={lStyle}>{label}</label>
              {type === 'select'
                ? <select value={f[key]} onChange={e=>setF({...f,[key]:e.target.value})} style={iStyle}>{EXAM_TYPES.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}</select>
                : <input type={type} value={f[key]} onChange={e=>setF({...f,[key]:e.target.value})} style={iStyle} />}
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button onClick={onClose} style={{padding:'9px 20px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',cursor:'pointer',fontSize:13}}>Cancel</button>
          <button onClick={()=>onSave(f)} disabled={!f.name.trim()||loading} style={{padding:'9px 20px',borderRadius:8,border:'none',background:'#6366f1',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,opacity:loading?0.6:1}}>
            {loading?'Saving…':'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Create Exam Form ── */
const CreateForm = ({ sessionId, classes, templates, onClose }) => {
  const [createExam, { isLoading }] = useCreateECExamMutation();
  const [f, setF] = useState({ name:'', type:'half_yearly', description:'', scope:'all', classIds:[], startDate:'', endDate:'', maxMarks:100, passingMarks:33, templateId:'' });

  const toggle = id => setF(p => ({ ...p, classIds: p.classIds.includes(id) ? p.classIds.filter(x=>x!==id) : [...p.classIds,id] }));

  const submit = async e => {
    e.preventDefault();
    if (!f.name.trim()) return toast.error('Exam name is required');
    try {
      const payload = { ...f, session: sessionId };
      if (f.scope === 'all') delete payload.classIds;
      if (!payload.templateId) delete payload.templateId;
      await createExam(payload).unwrap();
      toast.success('Exam created successfully ✅');
      onClose();
    } catch (err) { toast.error(err?.data?.message || 'Failed to create exam'); }
  };

  return (
    <div style={{background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:16,padding:24,marginBottom:24}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h3 style={{margin:0,fontSize:16,fontWeight:700,color:'#1e293b'}}>➕ Create New Exam</h3>
        <button onClick={onClose} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#94a3b8'}}>✕</button>
      </div>
      <form onSubmit={submit}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14,marginBottom:16}}>
          {[['Exam Name *','name','text'],['Description','description','text'],['Start Date','startDate','date'],['End Date','endDate','date'],['Max Marks','maxMarks','number'],['Pass Marks','passingMarks','number']].map(([label,key,type])=>(
            <div key={key}>
              <label style={lStyle}>{label}</label>
              <input type={type} value={f[key]} onChange={e=>setF({...f,[key]:e.target.value})} style={iStyle} required={key==='name'} />
            </div>
          ))}
          <div>
            <label style={lStyle}>Exam Type</label>
            <select value={f.type} onChange={e=>setF({...f,type:e.target.value})} style={iStyle}>
              {EXAM_TYPES.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
          {templates.length > 0 && (
            <div>
              <label style={lStyle}>Report Template</label>
              <select value={f.templateId} onChange={e=>setF({...f,templateId:e.target.value})} style={iStyle}>
                <option value="">— No template —</option>
                {templates.map(t=><option key={t._id} value={t._id}>{t.name}{t.isDefault?' ⭐':''}</option>)}
              </select>
            </div>
          )}
        </div>
        <div style={{marginBottom:16}}>
          <label style={lStyle}>Scope</label>
          <div style={{display:'flex',gap:16,marginBottom:10}}>
            {['all','selected'].map(v=>(
              <label key={v} style={{display:'flex',alignItems:'center',gap:6,fontSize:13,cursor:'pointer'}}>
                <input type="radio" checked={f.scope===v} onChange={()=>setF({...f,scope:v,classIds:[]})} /> {v==='all'?'All Classes':'Select Classes'}
              </label>
            ))}
          </div>
          {f.scope==='selected' && (
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {classes.map(c=>(
                <label key={c._id} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:8,border:`1.5px solid ${f.classIds.includes(c._id)?'#6366f1':'#e2e8f0'}`,background:f.classIds.includes(c._id)?'#eef2ff':'#fff',cursor:'pointer',fontSize:13}}>
                  <input type="checkbox" style={{display:'none'}} checked={f.classIds.includes(c._id)} onChange={()=>toggle(c._id)} />
                  {c.name}
                </label>
              ))}
            </div>
          )}
        </div>
        <button type="submit" disabled={isLoading} style={{padding:'10px 24px',borderRadius:10,border:'none',background:'#6366f1',color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer',opacity:isLoading?0.6:1}}>
          {isLoading?'Creating…':'Create Exam'}
        </button>
      </form>
    </div>
  );
};

/* ── Main Component ── */
const ECAllExams = () => {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [editExam, setEditExam] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const { data: sessionData } = useGetECActiveSessionQuery();
  const sessionId = sessionData?.data?._id;

  const { data: examsData, isLoading } = useGetECAllExamsQuery({ session: sessionId }, { skip: !sessionId });
  const { data: classData } = useGetECClassesQuery({ session: sessionId }, { skip: !sessionId });
  const { data: templatesData } = useGetECTemplatesQuery(undefined, { skip: !sessionId });
  const { data: subjectData } = useGetECExamSubjectsQuery({ examId: selectedId }, { skip: !selectedId });

  const [updateExam, { isLoading: updating }] = useUpdateECExamMutation();
  const [deleteExam] = useDeleteECExamMutation();
  const [updateSubject, { isLoading: updatingSub }] = useUpdateECExamSubjectMutation();
  const [removeSubject] = useRemoveECExamSubjectMutation();
  const [linkTemplate, { isLoading: linking }] = useLinkECTemplateToExamMutation();

  const exams = examsData?.data || [];
  const classes = classData?.data || [];
  const templates = templatesData?.data || [];
  const subjects = subjectData?.data || [];

  const filtered = useMemo(() => exams.filter(e =>
    !search || e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.type?.toLowerCase().includes(search.toLowerCase())
  ), [exams, search]);

  const subjectsByClass = useMemo(() => {
    const g = {};
    subjects.forEach(s => {
      const cid = s.classId?._id;
      if (!g[cid]) g[cid] = { name: s.classId?.name, items: [] };
      g[cid].items.push(s);
    });
    return g;
  }, [subjects]);

  const doDelete = exam => setConfirm({ msg: `Delete "${exam.name}"? This cannot be undone.`, onOk: async () => {
    try { await deleteExam(exam._id).unwrap(); toast.success('Exam deleted'); if (selectedId===exam._id) setSelectedId(null); }
    catch(err) { toast.error(err?.data?.message||'Error'); }
    setConfirm(null);
  }});

  const doSaveEdit = async data => {
    try { await updateExam({ id: editExam._id, ...data }).unwrap(); toast.success('Exam updated'); setEditExam(null); }
    catch(err) { toast.error(err?.data?.message||'Failed'); }
  };

  const doRemoveSub = sub => setConfirm({ msg: `Remove "${sub.subjectId?.name}" from ${sub.classId?.name}?`, onOk: async () => {
    try { await removeSubject(sub._id).unwrap(); toast.success('Subject removed'); }
    catch(err) { toast.error(err?.data?.message||'Error'); }
    setConfirm(null);
  }});

  return (
    <div>
      {confirm && <Confirm msg={confirm.msg} onOk={confirm.onOk} onCancel={()=>setConfirm(null)} />}
      {editExam && <EditModal exam={editExam} onClose={()=>setEditExam(null)} onSave={doSaveEdit} loading={updating} />}

      {/* Header */}
      <div style={{marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:'var(--text-primary)',margin:'0 0 4px'}}>📆 Exam Management</h1>
          <p style={{color:'var(--text-secondary)',margin:0,fontSize:13}}>{exams.length} examination{exams.length!==1?'s':''} in active session</p>
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <input type="text" placeholder="🔍 Search…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{padding:'8px 14px',borderRadius:8,border:'1.5px solid var(--card-border)',fontSize:13,width:200,background:'var(--card-bg)',color:'var(--text-primary)'}} />
          <button onClick={()=>setShowCreate(v=>!v)} style={{padding:'9px 18px',borderRadius:10,border:'none',background:showCreate?'#ef4444':'#6366f1',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>
            {showCreate?'✕ Cancel':'+ Create Exam'}
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && sessionId && (
        <CreateForm sessionId={sessionId} classes={classes} templates={templates} onClose={()=>setShowCreate(false)} />
      )}

      {isLoading ? (
        <div style={{textAlign:'center',padding:56,color:'#64748b'}}>Loading exams…</div>
      ) : filtered.length === 0 ? (
        <div style={{textAlign:'center',padding:56,color:'#94a3b8'}}>
          <div style={{fontSize:44,marginBottom:8}}>📭</div>
          <p style={{margin:0}}>{search?'No exams match your search.':'No exams found. Create one above!'}</p>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
          {filtered.map(exam => {
            const ss = statusStyle(exam.status);
            const selected = selectedId === exam._id;
            return (
              <div key={exam._id} onClick={()=>setSelectedId(selected?null:exam._id)}
                style={{background:'var(--card-bg)',borderRadius:14,border:`2px solid ${selected?'#6366f1':'var(--card-border)'}`,padding:'18px 20px',cursor:'pointer',transition:'all 0.18s',boxShadow:selected?'0 4px 20px rgba(99,102,241,0.18)':'0 1px 4px rgba(0,0,0,0.06)'}}>

                {/* Exam header */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                  <div style={{fontWeight:700,fontSize:15,color:'var(--text-primary)',flex:1,marginRight:8}}>{exam.name}</div>
                  <span style={{display:'inline-block',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:ss.bg,color:ss.c,whiteSpace:'nowrap',flexShrink:0}}>
                    {exam.status||'—'}
                  </span>
                </div>

                <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:4}}>
                  Type: <strong style={{color:'var(--text-secondary)'}}>{exam.type?.replace(/_/g,' ')||'—'}</strong>
                </div>
                <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:4}}>
                  📅 {fmtDate(exam.startDate)} → {fmtDate(exam.endDate)}
                </div>
                {exam.classIds?.length > 0 && (
                  <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:8}}>{exam.classIds.length} class{exam.classIds.length!==1?'es':''}</div>
                )}

                {/* Template badge */}
                {exam.templateId ? (
                  <span style={{display:'inline-block',fontSize:11,background:'#f0fdf4',border:'1px solid #86efac',borderRadius:12,padding:'2px 10px',color:'#166534',fontWeight:600,marginBottom:8}}>
                    📄 {exam.templateId?.name||'Template linked'}
                  </span>
                ) : (
                  <span style={{display:'inline-block',fontSize:11,background:'#fefce8',border:'1px solid #fde047',borderRadius:12,padding:'2px 10px',color:'#854d0e',marginBottom:8}}>
                    ⚠️ No template
                  </span>
                )}

                {/* Quick template link */}
                {templates.length > 0 && (
                  <div onClick={e=>e.stopPropagation()} style={{marginBottom:10}}>
                    <select value={exam.templateId?._id||exam.templateId||''} disabled={linking}
                      onChange={e=>{e.stopPropagation();linkTemplate({examId:exam._id,templateId:e.target.value}).unwrap().then(()=>toast.success('Template updated')).catch(()=>toast.error('Failed'));}}
                      style={{...iStyle,fontSize:12,padding:'5px 10px'}}>
                      <option value="">— link template —</option>
                      {templates.map(t=><option key={t._id} value={t._id}>{t.name}{t.isDefault?' ⭐':''}</option>)}
                    </select>
                  </div>
                )}

                {/* Actions */}
                {!exam.evaluationLocked && (
                  <div style={{display:'flex',gap:10}} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>setEditExam(exam)} style={{flex:1,padding:'6px',borderRadius:8,border:'1.5px solid #6366f1',background:'#eef2ff',color:'#6366f1',fontWeight:600,fontSize:12,cursor:'pointer'}}>✏️ Edit</button>
                    <button onClick={()=>doDelete(exam)} style={{flex:1,padding:'6px',borderRadius:8,border:'1.5px solid #ef4444',background:'#fef2f2',color:'#ef4444',fontWeight:600,fontSize:12,cursor:'pointer'}}>🗑️ Delete</button>
                  </div>
                )}
                {exam.evaluationLocked && <div style={{fontSize:11,color:'#94a3b8',marginTop:4}}>🔒 Evaluation locked</div>}

                {/* Subjects panel */}
                {selected && (
                  <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid var(--card-border)'}}>
                    <div style={{fontWeight:600,fontSize:13,color:'var(--text-primary)',marginBottom:10}}>📚 Subjects by Class</div>
                    {Object.keys(subjectsByClass).length === 0 ? (
                      <div style={{fontSize:12,color:'#94a3b8',textAlign:'center',padding:'12px 0'}}>No subjects configured for this exam</div>
                    ) : Object.entries(subjectsByClass).map(([cid,info])=>(
                      <div key={cid} style={{marginBottom:12}}>
                        <div style={{fontSize:12,fontWeight:700,color:'#6366f1',marginBottom:6}}>{info.name}</div>
                        {info.items.map(s=>(
                          <div key={s._id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f1f5f9'}}>
                            <div>
                              <span style={{fontSize:12,color:'var(--text-primary)',fontWeight:500}}>{s.subjectId?.name}</span>
                              <span style={{fontSize:11,color:'#94a3b8',marginLeft:6}}>({s.maxMarks} marks, pass {s.passingMarks})</span>
                            </div>
                            {!exam.evaluationLocked && (
                              <button onClick={e=>{e.stopPropagation();doRemoveSub(s);}}
                                style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:12,fontWeight:600,padding:'2px 6px'}}>✕</button>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ECAllExams;
