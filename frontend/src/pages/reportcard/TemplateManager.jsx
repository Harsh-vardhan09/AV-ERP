import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useGetReportTemplatesQuery,
  useDeleteReportTemplateMutation,
  useSetDefaultTemplateMutation,
  useCloneReportTemplateMutation,
  useGetReportTemplateStatsQuery,
  useUpdateReportTemplateMutation,
} from '../../redux/api/reportTemplateApi';
import './reportCard.css';

const TEMPLATE_TYPE_LABELS = {
  annual: 'Annual', half_yearly: 'Half Yearly',
  term1: 'Term 1', term2: 'Term 2', custom: 'Custom',
};

const getClassGroupBadge = (template) => {
  if (template.applicableClassIds?.length > 0) {
    const label = template.classGroupName || `${template.applicableClassIds.length} class(es)`;
    return { icon: '🎯', label, color: '#7c3aed', bg: '#ede9fe' };
  }
  if (template.classRangeFrom != null && template.classRangeTo != null) {
    const label = template.classGroupName || `Class ${template.classRangeFrom}–${template.classRangeTo}`;
    const icon  = template.classRangeTo - template.classRangeFrom <= 2 ? '🏫' : '📚';
    return { icon, label, color: '#0369a1', bg: '#e0f2fe' };
  }
  return { icon: '🌐', label: 'All Classes', color: '#15803d', bg: '#dcfce7' };
};

// ── Class Mapping Tab Component ────────────────────────────────────────────────
function ClassMappingTab({ templates, onSaveMapping }) {
  const [mappingRows, setMappingRows] = useState([]);
  const [saving, setSaving] = useState(null);

  // Build mapping rows from existing ranged/specific templates
  useEffect(() => {
    const ranged = (templates || []).filter(t => t.classRangeFrom != null || t.applicableClassIds?.length);
    const global = (templates || []).filter(t => t.classRangeFrom == null && !t.applicableClassIds?.length);
    const rows = [
      ...ranged.map(t => ({
        id:        t._id,
        label:     t.classGroupName || `${t.classRangeFrom}–${t.classRangeTo}`,
        from:      t.classRangeFrom,
        to:        t.classRangeTo,
        templateId: t._id,
        templateName: t.name,
        status:    t.templateStatus || 'published',
        isDefault: t.isDefault,
        isActive:  t.isActive,
      })),
    ];
    if (global.length) {
      rows.push({
        id: 'global',
        label: '🌐 Global (All Classes)',
        from: null, to: null,
        templateId: global[0]._id,
        templateName: global[0].name,
        status: global[0].templateStatus || 'published',
        isDefault: global[0].isDefault,
        isActive: global[0].isActive,
      });
    }
    setMappingRows(rows);
  }, [templates]);

  // New mapping row form
  const [newRow, setNewRow] = useState({ label:'', from:'', to:'', templateId:'' });
  const [showAddRow, setShowAddRow] = useState(false);

  const allTemplates = templates || [];

  const handleChangeTemplate = async (row, newTemplateId) => {
    if (!newTemplateId || newTemplateId === row.templateId) return;
    setSaving(row.id);
    try {
      await onSaveMapping(newTemplateId, {
        classGroupName: row.label,
        classRangeFrom: row.from,
        classRangeTo:   row.to,
      });
      toast.success(`Mapping updated for "${row.label}"`);
    } catch (e) {
      toast.error(e?.data?.message || 'Failed to update mapping');
    } finally { setSaving(null); }
  };

  const handleAddRow = async () => {
    if (!newRow.label || !newRow.templateId) return toast.error('Label and template are required');
    if (!newRow.from || !newRow.to) return toast.error('Class range is required');
    setSaving('new');
    try {
      await onSaveMapping(newRow.templateId, {
        classGroupName: newRow.label,
        classRangeFrom: Number(newRow.from),
        classRangeTo:   Number(newRow.to),
      });
      toast.success('Class mapping added');
      setNewRow({ label:'', from:'', to:'', templateId:'' });
      setShowAddRow(false);
    } catch (e) {
      toast.error(e?.data?.message || 'Failed to add mapping');
    } finally { setSaving(null); }
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
        <div>
          <h3 style={{ margin:'0 0 4px', fontSize:'1rem', fontWeight:700, color:'#1e293b' }}>Class-Wise Template Mapping</h3>
          <p style={{ margin:0, fontSize:'0.82rem', color:'#64748b' }}>
            Assign specific report card templates to class groups. The resolver uses this to auto-pick the correct template.
          </p>
        </div>
        <button className="rc-btn rc-btn-primary rc-btn-sm" onClick={() => setShowAddRow(p => !p)}>
          {showAddRow ? '✕ Cancel' : '+ Add Mapping'}
        </button>
      </div>

      {/* Add Mapping Form */}
      {showAddRow && (
        <div style={{ background:'#f8fafc', border:'1px dashed #c7d2fe', borderRadius:'8px', padding:'16px', marginBottom:'16px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 2fr auto', gap:'10px', alignItems:'flex-end' }}>
            <div>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:600, marginBottom:'4px', color:'#374151' }}>Group Label</label>
              <input className="rc-input" placeholder="e.g. Class 1–5"
                value={newRow.label} onChange={e => setNewRow(p => ({ ...p, label: e.target.value }))} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:600, marginBottom:'4px', color:'#374151' }}>From (numericOrder)</label>
              <input className="rc-input" type="number" placeholder="1"
                value={newRow.from} onChange={e => setNewRow(p => ({ ...p, from: e.target.value }))} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:600, marginBottom:'4px', color:'#374151' }}>To (numericOrder)</label>
              <input className="rc-input" type="number" placeholder="5"
                value={newRow.to} onChange={e => setNewRow(p => ({ ...p, to: e.target.value }))} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:600, marginBottom:'4px', color:'#374151' }}>Template</label>
              <select className="rc-select" value={newRow.templateId} onChange={e => setNewRow(p => ({ ...p, templateId: e.target.value }))}>
                <option value="">— Select Template —</option>
                {allTemplates.filter(t => t.isActive).map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
            <button className="rc-btn rc-btn-primary rc-btn-sm" onClick={handleAddRow} disabled={saving === 'new'}>
              {saving === 'new' ? '…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Mapping Matrix Table */}
      {mappingRows.length === 0 ? (
        <div className="rc-empty" style={{ padding:'32px 0', textAlign:'center' }}>
          <p style={{ color:'#94a3b8', marginBottom:'12px' }}>No class-group mappings configured yet.</p>
          <p style={{ fontSize:'0.8rem', color:'#cbd5e1' }}>
            Mappings are created when Super Admin uploads a template with class-group targeting,<br />
            or when you click "+ Add Mapping" above.
          </p>
        </div>
      ) : (
        <div style={{ overflowX:'auto' }}>
          <table className="rc-table">
            <thead>
              <tr>
                <th>Class Group</th>
                <th>Range</th>
                <th>Current Template</th>
                <th>Status</th>
                <th>Active</th>
                <th>Change Template</th>
              </tr>
            </thead>
            <tbody>
              {mappingRows.map(row => (
                <tr key={row.id}>
                  <td>
                    <span style={{
                      display:'inline-flex', alignItems:'center', gap:'4px',
                      padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:600,
                      background: row.from != null ? '#dbeafe' : '#ede9fe',
                      color:      row.from != null ? '#1e40af' : '#5b21b6',
                    }}>
                      {row.from != null ? '📚' : '🌐'} {row.label}
                    </span>
                  </td>
                  <td style={{ fontSize:'0.82rem', color:'#475569' }}>
                    {row.from != null ? `${row.from} → ${row.to}` : 'All'}
                  </td>
                  <td>
                    <span style={{ fontWeight:500, fontSize:'0.87rem', color:'#1e293b' }}>{row.templateName}</span>
                    {row.isDefault && (
                      <span style={{ marginLeft:'6px', background:'#fef3c7', color:'#92400e', borderRadius:'4px', padding:'1px 6px', fontSize:'10px', fontWeight:700 }}>DEFAULT</span>
                    )}
                  </td>
                  <td>
                    <span style={{
                      borderRadius:'20px', padding:'3px 10px', fontSize:'11px', fontWeight:600,
                      background: row.status === 'published' ? '#dcfce7' : row.status === 'recommended' ? '#fef3c7' : '#f1f5f9',
                      color:      row.status === 'published' ? '#166534' : row.status === 'recommended' ? '#92400e' : '#475569',
                    }}>
                      {row.status}
                    </span>
                  </td>
                  <td>
                    <span className={`rc-badge ${row.isActive ? 'rc-badge-success' : 'rc-badge-warning'}`}>
                      {row.isActive ? 'Active' : 'Off'}
                    </span>
                  </td>
                  <td>
                    <select className="rc-select" style={{ minWidth:'160px', fontSize:'0.82rem' }}
                      defaultValue={row.templateId}
                      onChange={e => handleChangeTemplate(row, e.target.value)}
                      disabled={saving === row.id}>
                      {allTemplates.filter(t => t.isActive).map(t => (
                        <option key={t._id} value={t._id}>{t.name}</option>
                      ))}
                    </select>
                    {saving === row.id && <span style={{ marginLeft:'6px', fontSize:'0.78rem', color:'#6366f1' }}>Saving…</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Resolver Priority Legend */}
      <div style={{ marginTop:'20px', padding:'14px 16px', background:'linear-gradient(135deg,#f0f9ff,#e0f2fe)', borderRadius:'8px', border:'1px solid #bae6fd' }}>
        <div style={{ fontWeight:700, fontSize:'0.82rem', color:'#0c4a6e', marginBottom:'8px' }}>🔍 Resolver Priority (auto-matching)</div>
        <ol style={{ margin:0, paddingLeft:'20px', fontSize:'0.78rem', color:'#075985', lineHeight:'1.8' }}>
          <li>Explicit templateId (manual override)</li>
          <li><strong>🎯 Specific class IDs</strong> (exact match)</li>
          <li><strong>📚 Smallest range</strong> covering student's class</li>
          <li>isDefault matching exam type (scoped)</li>
          <li>isDefault (global fallback)</li>
          <li>⭐ Super Admin Recommended</li>
          <li>First active template</li>
        </ol>
      </div>
    </div>
  );
}

// ── Main TemplateManager ────────────────────────────────────────────────────────
const TemplateManager = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('templates'); // 'templates' | 'mapping'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: templatesData, isLoading: isLoadingTemplates, refetch } = useGetReportTemplatesQuery({
    page, limit,
    templateType: filterType || undefined,
    search: searchTerm || undefined,
  });
  const { data: statsData }  = useGetReportTemplateStatsQuery();

  const [deleteTemplate,  { isLoading: isDeleting }]      = useDeleteReportTemplateMutation();
  const [setDefault,      { isLoading: isSettingDefault }] = useSetDefaultTemplateMutation();
  const [cloneTemplate,   { isLoading: isCloning }]        = useCloneReportTemplateMutation();
  const [updateTemplate]                                    = useUpdateReportTemplateMutation();

  const templates  = templatesData?.data || [];
  const pagination = templatesData?.pagination;
  const stats      = statsData?.data;

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await deleteTemplate(id).unwrap(); toast.success('Template deleted'); }
    catch (e) { toast.error(e?.data?.message || 'Delete failed'); }
  };

  const handleSetDefault = async (id) => {
    try { await setDefault(id).unwrap(); toast.success('Set as default'); }
    catch (e) { toast.error(e?.data?.message || 'Failed'); }
  };

  const handleClone = async (id, name) => {
    const n = prompt('Clone name:', `${name} (Copy)`);
    if (!n) return;
    try { await cloneTemplate({ id, newName: n }).unwrap(); toast.success('Cloned'); }
    catch (e) { toast.error(e?.data?.message || 'Clone failed'); }
  };

  /**
   * Saves a class-group mapping by updating the chosen template with range metadata.
   * @param {string} templateId  Template to apply the mapping to
   * @param {object} mapping     { classGroupName, classRangeFrom, classRangeTo }
   */
  const handleSaveMapping = (templateId, mapping) =>
    updateTemplate({ id: templateId, ...mapping }).unwrap();

  const TAB_STYLE = (active) => ({
    padding: '8px 20px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: '0.88rem',
    background: active ? '#fff' : 'transparent',
    color: active ? '#4f46e5' : '#64748b',
    borderBottom: active ? '2px solid #4f46e5' : '2px solid transparent',
    transition: 'all .2s',
  });

  return (
    <div className="rc-container">
      <div className="rc-header">
        <h1 className="rc-title">Report Templates</h1>
        {activeTab === 'templates' && (
          <button className="rc-btn rc-btn-primary" onClick={() => navigate('/report-cards/templates/new')}>
            + Create New Template
          </button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="rc-stats-grid" style={{ marginBottom:'24px' }}>
          <div className="rc-stat-card">
            <div className="rc-stat-value">{stats.overall?.totalTemplates || 0}</div>
            <div className="rc-stat-label">Total Templates</div>
          </div>
          <div className="rc-stat-card">
            <div className="rc-stat-value">{stats.overall?.defaultTemplates || 0}</div>
            <div className="rc-stat-label">Default Templates</div>
          </div>
          <div className="rc-stat-card">
            <div className="rc-stat-value">{stats.overall?.totalUsage || 0}</div>
            <div className="rc-stat-label">Total Uses</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:'4px', borderBottom:'1px solid #e2e8f0', marginBottom:'20px' }}>
        <button style={TAB_STYLE(activeTab === 'templates')} onClick={() => setActiveTab('templates')}>
          📄 Templates
        </button>
        <button style={TAB_STYLE(activeTab === 'mapping')} onClick={() => setActiveTab('mapping')}>
          🗺️ Class Mapping
        </button>
      </div>

      {/* ── Templates Tab ── */}
      {activeTab === 'templates' && (
        <>
          <div className="rc-filters" style={{ marginBottom:'20px', display:'flex', gap:'12px' }}>
            <input type="text" placeholder="Search templates..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)} className="rc-input" style={{ flex:1 }} />
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="rc-select">
              <option value="">All Types</option>
              {Object.entries(TEMPLATE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className="rc-btn rc-btn-secondary" onClick={() => refetch()}>Refresh</button>
          </div>

          {isLoadingTemplates ? (
            <div className="rc-loading">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="rc-empty">
              <p>No templates found.</p>
              <button className="rc-btn rc-btn-primary" onClick={() => navigate('/report-cards/templates/new')}>
                Create your first template
              </button>
            </div>
          ) : (
            <>
              <table className="rc-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Fields</th>
                    <th>Usage</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map(t => {
                    const badge = getClassGroupBadge(t);
                    return (
                      <tr key={t._id}>
                        <td>
                          <div className="rc-template-name">
                            {t.name}
                            {t.isDefault && <span className="rc-badge rc-badge-success" style={{ marginLeft:'8px' }}>Default</span>}
                          </div>
                          <span style={{
                            display:'inline-flex', alignItems:'center', gap:'4px', marginTop:'6px',
                            padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:600,
                            background: badge.bg, color: badge.color, border:`1px solid ${badge.color}33`,
                          }}>
                            {badge.icon} {badge.label}
                          </span>
                          <div style={{ fontSize:'12px', color:'#666', marginTop:'4px' }}>
                            {t.description || 'No description'}
                          </div>
                        </td>
                        <td>{TEMPLATE_TYPE_LABELS[t.templateType] || t.templateType}</td>
                        <td>{t.extractedFields?.length || 0} fields</td>
                        <td>{t.usageCount || 0} uses</td>
                        <td>
                          <span className={`rc-badge ${t.isActive ? 'rc-badge-success' : 'rc-badge-warning'}`}>
                            {t.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                            <button className="rc-btn rc-btn-sm rc-btn-secondary"
                              onClick={() => navigate(`/report-cards/templates/edit/${t._id}`)}>Edit</button>
                            {!t.isDefault && (
                              <button className="rc-btn rc-btn-sm rc-btn-secondary"
                                onClick={() => handleSetDefault(t._id)} disabled={isSettingDefault}>Set Default</button>
                            )}
                            <button className="rc-btn rc-btn-sm rc-btn-secondary"
                              onClick={() => handleClone(t._id, t.name)} disabled={isCloning}>Clone</button>
                            <button className="rc-btn rc-btn-sm rc-btn-danger"
                              onClick={() => handleDelete(t._id, t.name)} disabled={isDeleting}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {pagination?.pages > 1 && (
                <div style={{ marginTop:'20px', display:'flex', justifyContent:'center', gap:'8px' }}>
                  <button className="rc-btn rc-btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                  <span style={{ padding:'8px 16px' }}>Page {page} of {pagination.pages}</span>
                  <button className="rc-btn rc-btn-secondary" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Class Mapping Tab ── */}
      {activeTab === 'mapping' && (
        <ClassMappingTab
          templates={templates}
          onSaveMapping={handleSaveMapping}
        />
      )}
    </div>
  );
};

export default TemplateManager;
