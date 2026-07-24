// ══════════════════════════════════════════════════════════════════
// OASES Hook — useSheetList (Sprint 2)
// Auto-polls every 3s when any sheet is still processing.
// Stops polling when all sheets are done/failed.
// ══════════════════════════════════════════════════════════════════
import { useQuery } from '@tanstack/react-query';
import { oasesKeys } from '../../lib/queryKeys';
import { uploadService } from '../../services/uploadService';

/**
 * @param {string} examConfigId
 * @param {object} filters  { processingStatus?, status?, page?, limit? }
 */
export const useSheetList = (examConfigId, filters = {}) =>
  useQuery({
    queryKey: oasesKeys.sheets(examConfigId, filters),
    queryFn:  () => uploadService.listSheets(examConfigId, filters),
    enabled:  !!examConfigId,
    staleTime: 1000 * 10, // 10s — sheets change often during upload phase
    gcTime:    1000 * 60 * 5,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const DONE_STATUSES = ['eval1_done', 'eval2_done', 'locked', 'submitted', 'approved', 'rejected'];
      const hasProcessing = data.sheets?.some(
        (s) => s.processingStatus === 'processing' || s.processingStatus === 'pending'
      );
      // Also poll every 5s while any sheet is still being evaluated
      const hasActiveEval = data.sheets?.some(
        (s) => !DONE_STATUSES.includes(s.status) && s.status !== 'rejected'
      );
      if (hasProcessing) return 3000;   // fast poll during PDF processing
      if (hasActiveEval) return 5000;   // slow poll during evaluation phase
      return false;                     // stop polling when all done
    },
  });

export default useSheetList;

/**
 * Unassigned sheets for a given exam config — used in AssignmentManager.
 * @param {string} examConfigId
 */
export const useUnassignedSheets = (examConfigId) =>
  useQuery({
    queryKey: oasesKeys.unassignedSheets(examConfigId),
    queryFn:  () => uploadService.getUnassigned(examConfigId),
    enabled:  !!examConfigId,
    staleTime: 1000 * 30,
    gcTime:    1000 * 60 * 5,
  });
