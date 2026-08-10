import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetSchoolModulesQuery,
  useUpdateSchoolModuleMutation,
  useBulkUpdateSchoolModulesMutation,
} from '../api/superAdminApi';
import toast from 'react-hot-toast';
import { MdArrowBack, MdSave, MdRefresh } from 'react-icons/md';

// Icon map — Material Symbols names mapped to emoji for simplicity
// (keeps zero extra dependencies)
const MODULE_ICONS = {
  school:       '🏫',
  payments:     '💳',
  description:  '📄',
  article:      '📃',
  auto_stories: '📚',
  fingerprint:  '🔑',
  chat:         '💬',
  assignment:   '📝',
  upload_file:  '📤',
  how_to_reg:   '✅',
};

// Toggle switch component
const Toggle = ({ enabled, onToggle, disabled, loading }) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={disabled || loading}
    aria-label={disabled ? 'Always on — cannot be changed' : enabled ? 'Disable module' : 'Enable module'}
    style={{
      position: 'relative',
      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      background: disabled ? 'var(--color-card-border)' : enabled ? 'var(--color-success, #22c55e)' : 'var(--color-card-border)',
      transition: 'background 0.2s',
      flexShrink: 0,
      opacity: loading ? 0.6 : 1,
    }}
  >
    <span style={{
      position: 'absolute', top: 3, left: enabled ? 23 : 3,
      width: 18, height: 18, borderRadius: '50%', background: '#fff',
      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    }} />
  </button>
);

const SchoolModules = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useGetSchoolModulesQuery(id);
  const [updateModule] = useUpdateSchoolModuleMutation();
  const [bulkUpdate, { isLoading: isBulkSaving }] = useBulkUpdateSchoolModulesMutation();

  // localOverrides tracks any pending unsaved changes { moduleKey: boolean }
  const [pendingToggle, setPendingToggle] = useState(null); // key being toggled right now

  const school  = data?.data?.school;
  const modules = data?.data?.modules;

  const handleToggle = async (moduleKey, currentEnabled, canDisable) => {
    if (!canDisable) return;
    setPendingToggle(moduleKey);
    try {
      const result = await updateModule({ id, moduleKey, enabled: !currentEnabled }).unwrap();
      toast.success(result.message);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update module');
    } finally {
      setPendingToggle(null);
    }
  };

  // ── Loading skeletons ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => navigate('/superadmin/schools')} style={{ background: 'var(--color-primary-light)', border: '1px solid var(--card-border)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MdArrowBack size={16} /> Back
          </button>
          <div style={{ height: 22, width: 180, borderRadius: 6, background: 'var(--color-card-border)', animation: 'pulse 1.5s ease infinite' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="erp-section-card" style={{ padding: 20 }}>
              <div style={{ height: 18, width: '60%', borderRadius: 5, background: 'var(--color-card-border)', marginBottom: 10, animation: 'pulse 1.5s ease infinite' }} />
              <div style={{ height: 13, width: '80%', borderRadius: 4, background: 'var(--color-card-border)', animation: 'pulse 1.5s ease infinite' }} />
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      </>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (isError || !modules) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 16 }}>Failed to load module settings</div>
        <button onClick={() => refetch()} style={{ padding: '8px 20px', borderRadius: 8, background: 'var(--color-primary)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
          <MdRefresh size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Retry
        </button>
      </div>
    );
  }

  // Retired modules still ship in the registry; they are not a school's business
  const moduleList = Object.values(modules).filter((mod) => mod.available !== false);
  const enabledCount = moduleList.filter(m => m.enabled).length;

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/superadmin/schools')}
          style={{ background: 'var(--color-primary-light)', border: '1px solid var(--card-border)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}
        >
          <MdArrowBack size={16} /> Back to Schools
        </button>
        <div>
          <h1 className="erp-page-title" style={{ marginBottom: 0 }}>Module Permissions</h1>
        </div>
      </div>

      {/* School info bar */}
      <div className="erp-section-card" style={{ padding: '12px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: school?.isActive ? 'color-mix(in srgb,var(--color-success) 12%, white)' : 'color-mix(in srgb,var(--color-danger) 10%, white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            🏫
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{school?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Code:{' '}
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary)', background: 'var(--color-primary-light)', padding: '1px 6px', borderRadius: 4 }}>
                {school?.code}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', align: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-primary)' }}>{enabledCount}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>/{moduleList.length}</span></div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>modules active</div>
          </div>
        </div>
      </div>

      {/* Sub-header */}
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, marginTop: 0 }}>
        Modules included with every school.
        <span style={{ color: 'var(--color-danger)', marginLeft: 6 }}>
          🔒 Locked modules cannot be disabled.
        </span>
      </p>

      {/* Module cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {moduleList.map((mod) => {
          const isToggling = pendingToggle === mod.key;
          const locked = !mod.canDisable;

          return (
            <div
              key={mod.key}
              className="erp-section-card"
              style={{
                padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
                borderLeft: `4px solid ${mod.enabled ? 'var(--color-success, #22c55e)' : 'var(--color-card-border)'}`,
                transition: 'border-color 0.2s',
                opacity: locked && !mod.enabled ? 0.75 : 1,
              }}
            >
              {/* Top row: icon + title + toggle */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: mod.enabled ? 'color-mix(in srgb,var(--color-primary) 12%, white)' : 'var(--color-primary-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>
                    {MODULE_ICONS[mod.icon] || '🔧'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                      {mod.label}
                    </div>
                    {locked && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--color-card-border)', borderRadius: 4, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Always On
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <Toggle
                    enabled={mod.enabled}
                    disabled={locked || isToggling}
                    loading={isToggling}
                    onToggle={() => handleToggle(mod.key, mod.enabled, mod.canDisable)}
                  />
                  <span style={{ fontSize: 10, fontWeight: 600, color: mod.enabled ? 'var(--color-success, #22c55e)' : 'var(--text-muted)' }}>
                    {isToggling ? '…' : mod.enabled ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {mod.description}
              </p>

              {/* Status badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
                  padding: '2px 10px', borderRadius: 20,
                  background: mod.enabled ? 'color-mix(in srgb,var(--color-success, #22c55e) 12%, white)' : 'color-mix(in srgb,var(--color-danger, #ef4444) 8%, white)',
                  color: mod.enabled ? 'var(--color-success, #16a34a)' : 'var(--color-danger, #dc2626)',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                  {mod.enabled ? 'Enabled for this school' : 'Disabled for this school'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </>
  );
};

export default SchoolModules;
