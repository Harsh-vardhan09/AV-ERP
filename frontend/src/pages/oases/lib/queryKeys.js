// ══════════════════════════════════════════════════════════════════
// OASES — Query Key Factories
// Single source of truth for all React Query cache keys.
// Rule: keys are always arrays so React Query can invalidate
// by prefix (e.g. invalidate ['sheets', examConfigId] → all pages)
// ══════════════════════════════════════════════════════════════════

export const oasesKeys = {
  // ── Exam Config ────────────────────────────────────────────────
  examConfigs:      (filters = {}) => ['oases', 'examConfigs', filters],
  examConfig:       (id)           => ['oases', 'examConfig', id],

  // ── Question Scheme ────────────────────────────────────────────
  scheme:           (examConfigId) => ['oases', 'scheme', examConfigId],

  // ── Answer Sheets ──────────────────────────────────────────────
  sheets:           (examConfigId, filters = {}) => ['oases', 'sheets', examConfigId, filters],
  sheet:            (id)           => ['oases', 'sheet', id],
  sheetPage:        (id, pg)       => ['oases', 'sheet', id, 'page', pg],
  unassignedSheets: (examConfigId) => ['oases', 'sheets', examConfigId, 'unassigned'],
  checkedSheets:    (filters = {}) => ['oases', 'checked-sheets', filters],

  // ── Evaluator Queue ────────────────────────────────────────────
  evalQueue:        (filters = {}) => ['oases', 'eval', 'queue', filters],
  evalDraft:        (sheetId)      => ['oases', 'eval', 'draft', sheetId],

  // ── Assignments ────────────────────────────────────────────────
  assignments:      (filters = {}) => ['oases', 'assignments', filters],

  // ── Conflicts ─────────────────────────────────────────────────
  conflicts:        (examConfigId) => ['oases', 'conflicts', examConfigId],
  conflict:         (sheetId)      => ['oases', 'conflict', sheetId],
  conflictSheet:    (sheetId)      => ['oases', 'conflict-sheet', sheetId], // Sprint 5: HE panel

  // ── Results ───────────────────────────────────────────────────
  results:          (examConfigId) => ['oases', 'results', examConfigId],

  // ── Reports (Sprint 6) ────────────────────────────────────────
  reports:          (examId)       => ['oases', 'reports', 'summary', examId],
  reportResults:    (examId)       => ['oases', 'reports', 'results', examId],
  evalStats:        (examId)       => ['oases', 'reports', 'evaluator', examId],
  remuneration:     (examId)       => ['oases', 'reports', 'remuneration', examId],

  // ── Audit Log ─────────────────────────────────────────────────
  auditLogs:        (filters = {}) => ['oases', 'audit', filters],
  auditEntity:      (entityId)     => ['oases', 'audit', 'entity', entityId],

  // ── Notifications ─────────────────────────────────────────────
  notifications:    ()             => ['oases', 'notifications'],
};

export default oasesKeys;
