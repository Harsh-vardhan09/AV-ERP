// ══════════════════════════════════════════════════════════════════
// OASES Hooks — Assignment Mutations (Sprint 2)
// ══════════════════════════════════════════════════════════════════
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { oasesKeys } from '../../lib/queryKeys';
import { assignmentService } from '../../services/uploadService';
import toast from 'react-hot-toast';

/** Assign a single sheet to one evaluator */
export const useAssignSingle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sheetId, ...payload }) => assignmentService.assignSingle(sheetId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['oases', 'sheets'] });
      qc.invalidateQueries({ queryKey: ['oases', 'assignments'] });
      toast.success('Sheet assigned successfully!');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Assignment failed.'),
  });
};

/**
 * Bulk assign — round-robin or random.
 * @param {string} examId
 * @param {{ evaluatorIds, strategy, round, deadlineDate }} payload
 */
export const useAssignBulk = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ examId, ...payload }) => assignmentService.bulkAssign(examId, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['oases', 'sheets'] });
      qc.invalidateQueries({ queryKey: ['oases', 'assignments'] });
      toast.success(`${data.assigned} sheet(s) assigned via ${data.strategy}!`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Bulk assignment failed.'),
  });
};

/** Reprocess a failed sheet */
export const useReprocessSheet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sheetId) => import('../../services/uploadService').then((m) => m.uploadService.reprocess(sheetId)),
    onSuccess: (_, sheetId) => {
      qc.invalidateQueries({ queryKey: oasesKeys.sheet(sheetId) });
      qc.invalidateQueries({ queryKey: ['oases', 'sheets'] });
      toast.success('Sheet queued for reprocessing.');
    },
  });
};

export default useAssignBulk;
