// ══════════════════════════════════════════════════════════════════
// OASES Hook — useAssignSheet (mutation)
// SCHOOL_ADMIN bulk assigns sheets to evaluators
// ══════════════════════════════════════════════════════════════════
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { oasesKeys } from '../../lib/queryKeys';
import { assignmentService } from '../../services/adminService';
import toast from 'react-hot-toast';

export const useAssignSheets = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => assignmentService.assign(payload),
    onSuccess: (_data, variables) => {
      // Invalidate unassigned sheets for this exam config
      qc.invalidateQueries({
        queryKey: oasesKeys.unassignedSheets(variables.examConfigId),
      });
      // Invalidate assignments list
      qc.invalidateQueries({ queryKey: ['oases', 'assignments'] });
      toast.success(`${variables.sheetIds?.length || 0} sheet(s) assigned!`);
    },
  });
};
