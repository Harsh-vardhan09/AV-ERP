// ══════════════════════════════════════════════════════════════════
// OASES — Evaluation Session Store (Zustand) — Sprint 3
// Tracks UI-only state. Actual marks live in React Query.
// Sprint 3 additions: lastSaved, sessionStartedAt, rotations,
//   annotationTool, splitRatio
// ══════════════════════════════════════════════════════════════════
import { create } from 'zustand';

const useEvaluationStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────
  currentSheetId:   null,
  currentPage:      1,
  pagesReviewed:    new Set(),
  annotationMode:   false,
  annotationTool:   'highlight',    // Sprint 3: highlight|circle|tick|cross
  zoomLevel:        1.0,
  rotations:        {},             // Sprint 3: { [pageNo]: degrees }
  isDirty:          false,
  sidebarOpen:      true,
  lastSaved:        null,           // Sprint 3: last auto-save timestamp
  sessionStartedAt: null,           // Sprint 3: when sheet was opened
  splitRatio:       65,             // Sprint 3: left pane % width

  // ── Actions ────────────────────────────────────────────────────

  openSheet: (sheetId) =>
    set({
      currentSheetId:   sheetId,
      currentPage:      1,
      pagesReviewed:    new Set(),
      isDirty:          false,
      rotations:        {},
      lastSaved:        null,
      sessionStartedAt: new Date(),
    }),

  setPage: (page) => set({ currentPage: page }),

  markPageReviewed: (page) =>
    set((state) => ({
      pagesReviewed: new Set([...state.pagesReviewed, page]),
    })),

  allPagesReviewed: (totalPages) => {
    const { pagesReviewed } = get();
    for (let i = 1; i <= totalPages; i++) {
      if (!pagesReviewed.has(i)) return false;
    }
    return true;
  },

  toggleAnnotationMode: () =>
    set((state) => ({ annotationMode: !state.annotationMode })),

  setAnnotationTool: (tool) => set({ annotationTool: tool }),

  setZoom: (level) =>
    set({ zoomLevel: Math.min(3.0, Math.max(0.25, level)) }),

  rotatePage: (pageNo) =>
    set((state) => ({
      rotations: {
        ...state.rotations,
        [pageNo]: ((state.rotations[pageNo] || 0) + 90) % 360,
      },
    })),

  setDirty: (dirty) => set({ isDirty: dirty }),

  setLastSaved: (ts) => set({ lastSaved: ts, isDirty: false }),

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSplitRatio: (ratio) =>
    set({ splitRatio: Math.min(80, Math.max(40, ratio)) }),

  closeSheet: () =>
    set({
      currentSheetId:   null,
      currentPage:      1,
      pagesReviewed:    new Set(),
      annotationMode:   false,
      annotationTool:   'highlight',
      zoomLevel:        1.0,
      rotations:        {},
      isDirty:          false,
      lastSaved:        null,
      sessionStartedAt: null,
    }),
}));

export default useEvaluationStore;
