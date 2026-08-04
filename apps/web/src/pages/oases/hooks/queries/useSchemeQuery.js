// ══════════════════════════════════════════════════════════════════
// OASES Hooks — Question Scheme (Sprint 1)
// ══════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { oasesKeys } from '../../lib/queryKeys';
import { examConfigService } from '../../services/examConfigService';
import toast from 'react-hot-toast';

/** Fetch question scheme — staleTime Infinity (rarely changes once set) */
export const useSchemeQuery = (examId) =>
  useQuery({
    queryKey:  oasesKeys.scheme(examId),
    queryFn:   () => examConfigService.getScheme(examId),
    enabled:   !!examId,
    staleTime: Infinity,
    gcTime:    1000 * 60 * 30,
    retry: (count, err) => err?.response?.status !== 404 && count < 2,
  });

/** Save (create/replace) scheme */
export const useSaveScheme = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ examId, ...scheme }) => examConfigService.saveScheme(examId, scheme),
    onSuccess: (_, { examId }) => {
      qc.invalidateQueries({ queryKey: oasesKeys.scheme(examId) });
      toast.success('Question scheme saved!');
    },
  });
};

/** Patch individual questions */
export const usePatchScheme = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ examId, questions }) =>
      examConfigService.patchScheme(examId, questions),
    onSuccess: (_, { examId }) => {
      qc.invalidateQueries({ queryKey: oasesKeys.scheme(examId) });
    },
  });
};

/** Upload MCQ answer key from parsed CSV */
export const useUploadAnswerKey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ examId, answerKey }) =>
      examConfigService.uploadAnswerKey(examId, answerKey),
    onSuccess: (_, { examId }) => {
      qc.invalidateQueries({ queryKey: oasesKeys.scheme(examId) });
      toast.success('Answer key applied!');
    },
  });
};
