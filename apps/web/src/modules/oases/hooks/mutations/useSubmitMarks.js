// ══════════════════════════════════════════════════════════════════
// OASES Hooks — Evaluation Mutations (Sprint 3 — THE CORE)
// useSaveMark: optimistic update per question
// useSaveDraft: silent auto-save (no toast)
// useSubmitEvaluation: final submit with cache cleanup
// useMarkPageReviewed: mark page as reviewed
// ══════════════════════════════════════════════════════════════════
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { oasesKeys } from '../../lib/queryKeys';
import { evalService } from '../../services/sheetService';
import toast from 'react-hot-toast';

/**
 * Save single question mark — optimistic update.
 * Updates draft cache immediately; rolls back on error.
 */
export const useSaveMark = (sheetId) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload) => evalService.saveMark({ sheetId, ...payload }),

    onMutate: async ({ questionNo, marksGiven, isNA }) => {
      await qc.cancelQueries({ queryKey: oasesKeys.evalDraft(sheetId) });
      const prev = qc.getQueryData(oasesKeys.evalDraft(sheetId));

      qc.setQueryData(oasesKeys.evalDraft(sheetId), (old) => {
        if (!old) return old;
        const marks = [...(old.marks || [])];
        const idx = marks.findIndex((m) => m.questionNo === questionNo);
        const entry = {
          questionNo,
          marksGiven: isNA ? 0 : marksGiven || 0,
          isNA: !!isNA,
          savedAt: new Date().toISOString(),
        };
        if (idx >= 0) marks[idx] = { ...marks[idx], ...entry };
        else marks.push(entry);
        return { ...old, marks };
      });

      return { prev };
    },

    onError: (_, __, ctx) => {
      if (ctx?.prev) qc.setQueryData(oasesKeys.evalDraft(sheetId), ctx.prev);
    },

    onSuccess: (data) => {
      // Update totals from server response
      qc.setQueryData(oasesKeys.evalDraft(sheetId), (old) => ({
        ...old,
        sectionTotals: data.sectionTotals,
        grandTotal: data.grandTotal,
      }));
    },
  });
};

/** Silent auto-save draft — no toast on success, swallow errors */
export const useSaveDraft = (sheetId) => {
  return useMutation({
    mutationFn: (body) => evalService.saveDraft(sheetId, body),
    onSuccess: () => {
      // Silent — evaluationStore.setLastSaved handled by caller
    },
    onError: () => {
      // Swallow — will retry next auto-save interval
    },
  });
};

/** Submit final marks — navigates to queue on success */
export const useSubmitEvaluation = (sheetId) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload) => evalService.submitMarks(sheetId, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: oasesKeys.evalQueue() });
      qc.invalidateQueries({ queryKey: oasesKeys.sheets() }); // Sprint 4: refresh admin sheet list
      qc.invalidateQueries({ queryKey: oasesKeys.checkedSheets() }); // Sprint 5: refresh admin checked copies tab
      qc.invalidateQueries({ queryKey: oasesKeys.auditEntity(sheetId) }); // Sprint 4: audit trail
      qc.removeQueries({ queryKey: oasesKeys.sheet(sheetId) });
      qc.removeQueries({ queryKey: oasesKeys.evalDraft(sheetId) });
      toast.success('Evaluation submitted successfully!');
      return data;
    },
    onError: (err) => {
      // oasesError puts errors at top-level: { success, error, errors: [...] }
      const serverErrors = err.response?.data?.errors;
      if (serverErrors?.length) {
        const firstMsg = serverErrors[0]?.msg || serverErrors[0];
        toast.error(`Validation: ${firstMsg}`, { duration: 6000 });
      } else {
        toast.error(
          err.response?.data?.error || err.response?.data?.message || 'Submission failed.'
        );
      }
    },
  });
};

/** Mark a page as reviewed */
export const useMarkPageReviewed = (sheetId) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (pageNo) => evalService.markPageReviewed(sheetId, pageNo),
    onMutate: async (pageNo) => {
      const prev = qc.getQueryData(oasesKeys.evalDraft(sheetId));
      qc.setQueryData(oasesKeys.evalDraft(sheetId), (old) => {
        if (!old) return old;
        const pages = new Set(old.pagesReviewed || []);
        pages.add(pageNo);
        return { ...old, pagesReviewed: [...pages] };
      });
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) qc.setQueryData(oasesKeys.evalDraft(sheetId), ctx.prev);
    },
  });
};
