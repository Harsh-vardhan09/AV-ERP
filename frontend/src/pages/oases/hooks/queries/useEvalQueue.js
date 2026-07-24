// ══════════════════════════════════════════════════════════════════
// OASES Hook — useEvalQueue + useSheetData + usePageUrl (Sprint 3)
// ══════════════════════════════════════════════════════════════════
import { useQuery } from '@tanstack/react-query';
import { oasesKeys } from '../../lib/queryKeys';
import { evalService } from '../../services/sheetService';

/** Evaluator's current pending queue */
export const useEvalQueue = (filters = {}) =>
  useQuery({
    queryKey:  oasesKeys.evalQueue(filters),
    queryFn:   () => evalService.getQueue(filters),
    staleTime: 1000 * 30,
    gcTime:    1000 * 60 * 5,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

/** Combined sheet + scheme + draft + pageUrls for evaluation */
export const useSheetData = (sheetId) =>
  useQuery({
    queryKey:  oasesKeys.sheet(sheetId),
    queryFn:   () => evalService.getSheetData(sheetId),
    enabled:   !!sheetId,
    staleTime: Infinity, // scheme doesn't change; draft managed by mutations
    gcTime:    1000 * 60 * 30,
  });

/** Saved draft marks for a sheet */
export const useEvalDraft = (sheetId) =>
  useQuery({
    queryKey:  oasesKeys.evalDraft(sheetId),
    queryFn:   () => evalService.getDraft(sheetId),
    enabled:   !!sheetId,
    staleTime: Infinity, // draft managed via optimistic updates
    gcTime:    1000 * 60 * 30,
  });

/** Signed URL for a single page — auto-refreshes 2 min before expiry */
export const usePageUrl = (sheetId, pageNo, enabled = true) =>
  useQuery({
    queryKey:  oasesKeys.sheetPage(sheetId, pageNo),
    queryFn:   () => evalService.getPageUrl(sheetId, pageNo),
    enabled:   enabled && !!sheetId && pageNo > 0,
    staleTime: 1000 * 60 * 12, // 12 min (URL expires at 15 min)
    gcTime:    1000 * 60 * 14,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.expiresAt) return false;
      const remaining = new Date(data.expiresAt) - Date.now();
      return remaining < 1000 * 60 * 2 ? 1000 * 60 : false;
    },
  });

/** Sheet detail for evaluation (legacy compat — wraps useSheetData) */
export const useSheetForEval = (sheetId) => useSheetData(sheetId);
