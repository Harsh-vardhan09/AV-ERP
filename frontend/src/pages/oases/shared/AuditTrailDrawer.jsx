// ══════════════════════════════════════════════════════════════════
// OASES — AuditTrailDrawer (Sprint 4)
// Slide-over panel showing full audit timeline for a sheet.
// Color-coded by action. Load More via useInfiniteQuery.
// ══════════════════════════════════════════════════════════════════
import React from 'react';
import { X, Loader2, ChevronDown, Shield, CheckCircle2, Lock, AlertTriangle, GitMerge, Pencil } from 'lucide-react';
import { useAuditLog } from '../hooks/queries/useAuditLog';

// ── Action type config ────────────────────────────────────────────
const ACTION_CONFIG = {
  // Evaluation
  MARK_ENTERED:         { label: 'Mark Entered',        icon: Pencil,        color: 'bg-blue-100 text-blue-700' },
  EVAL_SUBMITTED:       { label: 'Evaluation Submitted', icon: CheckCircle2,  color: 'bg-green-100 text-green-700' },
  MARKS_SUBMITTED:      { label: 'Marks Submitted',      icon: CheckCircle2,  color: 'bg-green-100 text-green-700' },
  // Lock / result
  RESULT_LOCKED:        { label: 'Result Locked',        icon: Lock,          color: 'bg-teal-100 text-teal-700' },
  RESULTS_GENERATED:    { label: 'Results Generated',    icon: Lock,          color: 'bg-teal-50 text-teal-600' },
  // UFM / rejection
  EVAL_UFM_FLAGGED:     { label: 'UFM Flagged',          icon: AlertTriangle, color: 'bg-red-100 text-red-700' },
  EVAL_SHEET_REJECTED:  { label: 'Sheet Rejected',        icon: AlertTriangle, color: 'bg-red-100 text-red-700' },
  SHEET_PROCESSED:      { label: 'Sheet Processed',       icon: CheckCircle2,  color: 'bg-indigo-100 text-indigo-700' },
  // Conflict
  CONFLICT_RAISED:      { label: 'Conflict Raised',       icon: GitMerge,      color: 'bg-amber-100 text-amber-700' },
  CONFLICT_RESOLVED:    { label: 'Conflict Resolved',     icon: CheckCircle2,  color: 'bg-purple-100 text-purple-700' },
  CONFLICT_ROUTED_TO_HEAD: { label: 'Routed to HE',       icon: GitMerge,      color: 'bg-orange-100 text-orange-700' },
};

const getActionConfig = (action) =>
  ACTION_CONFIG[action] || { label: action, icon: Shield, color: 'bg-gray-100 text-gray-600' };

// ── Single timeline event ─────────────────────────────────────────
const TimelineItem = ({ log, isFirst }) => {
  const cfg   = getActionConfig(log.action);
  const Icon  = cfg.icon;
  const actor = log.actorId?.name || log.actorId?.email || 'System';
  const time  = new Date(log.createdAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="flex gap-3 relative">
      {/* Connector line */}
      {!isFirst && (
        <div className="absolute left-4 -top-4 w-0.5 h-4 bg-gray-200" />
      )}
      {/* Icon */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${cfg.color} z-10`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-gray-800">{cfg.label}</p>
          <span className="text-[10px] text-gray-400 flex-shrink-0">{time}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">by {actor}</p>
        {log.details && Object.keys(log.details).length > 0 && (
          <div className="mt-1 px-2 py-1.5 bg-gray-50 rounded-lg text-[10px] text-gray-500 font-mono leading-relaxed">
            {Object.entries(log.details)
              .filter(([k]) => !['sheetId', 'examConfigId'].includes(k))
              .map(([k, v]) => (
                <span key={k} className="block">
                  {k}: <span className="text-gray-700">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main drawer ───────────────────────────────────────────────────
const AuditTrailDrawer = ({ entityId, title = 'Audit Trail', onClose }) => {
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useAuditLog(entityId);

  const allLogs = data?.pages?.flatMap((p) => {
    // Handle both array response and {logs:[]} response
    return Array.isArray(p) ? p : (p?.logs || []);
  }) || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel */}
      <div className="relative z-10 w-full max-w-md h-full bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-800">{title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Complete action history</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : allLogs.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <Shield className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No audit records found.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {allLogs.map((log, idx) => (
                <TimelineItem key={log._id || idx} log={log} isFirst={idx === 0} />
              ))}
            </div>
          )}

          {/* Load more */}
          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition disabled:opacity-50"
            >
              {isFetchingNextPage
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</>
                : <><ChevronDown className="w-3.5 h-3.5" /> Load More</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditTrailDrawer;
