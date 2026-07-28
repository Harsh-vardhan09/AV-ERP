// ══════════════════════════════════════════════════════════════════
// OASES Hooks — Head Examiner / Moderate (Sprint 5)
// useConflictList, useConflictSheetData, useResolveConflict
// ══════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { oasesKeys } from '../lib/queryKeys';
import { moderateService } from '../services/moderateService';
import toast from 'react-hot-toast';

/** Conflict queue for a given exam — refetches every minute */
export const useConflictList = (examId) =>
  useQuery({
    queryKey:        oasesKeys.conflicts(examId),
    queryFn:         () => moderateService.listConflicts(examId),
    enabled:         !!examId,
    staleTime:       1000 * 30,
    refetchInterval: 60_000,
  });

/** Full data for one conflict sheet (scheme + both marks) */
export const useConflictSheetData = (sheetId) =>
  useQuery({
    queryKey:  oasesKeys.conflictSheet(sheetId),
    queryFn:   () => moderateService.getConflictSheet(sheetId),
    enabled:   !!sheetId,
    staleTime: Infinity, // immutable once loaded
    gcTime:    1000 * 60 * 30,
  });

/** Submit HE resolution */
export const useResolveConflict = (examId) => {
  const qc       = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ sheetId, ...body }) => moderateService.resolve(sheetId, body),
    onSuccess: (_, { sheetId }) => {
      qc.invalidateQueries({ queryKey: oasesKeys.conflicts(examId) });
      qc.removeQueries({ queryKey: oasesKeys.conflictSheet(sheetId) });
      toast.success('Conflict resolved. Sheet is now locked.');
      navigate(`../../head-examiner/conflicts`);
    },
    onError: (err) => {
      const serverErrors = err.response?.data?.data?.errors;
      if (serverErrors?.length) {
        toast.error(`${serverErrors.length} validation error(s).`);
      } else {
        toast.error(err.response?.data?.error || 'Resolution failed.');
      }
    },
  });
};

/** Upload MCQ answer key mutation (Admin — in examConfigService) */
export const useUploadAnswerKey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ examId, answerKey, csv }) =>
      import('../services/examConfigService').then(({ examConfigService }) =>
        examConfigService.uploadAnswerKey(examId, answerKey || csv)
      ),
    onSuccess: (_, { examId }) => {
      qc.invalidateQueries({ queryKey: oasesKeys.scheme(examId) });
      toast.success('Answer key uploaded successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Answer key upload failed.');
    },
  });
};
