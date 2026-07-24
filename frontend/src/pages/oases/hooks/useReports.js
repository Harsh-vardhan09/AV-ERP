// ══════════════════════════════════════════════════════════════════
// OASES Hooks — Reports (Sprint 6)
// useExamReport, useGenerateResults, usePublishResults,
// useResultsList, useEvaluatorStats, downloadPDF
// ══════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { oasesKeys } from '../lib/queryKeys';
import { reportService } from '../services/reportService';
import toast from 'react-hot-toast';

// ── Summary stats + chart data ────────────────────────────────────
export const useExamReport = (examId) =>
  useQuery({
    queryKey:  oasesKeys.reports(examId),
    queryFn:   () => reportService.getExamSummary(examId),
    enabled:   !!examId,
    staleTime: 1000 * 60 * 5,
  });

// ── Infinite paginated results table ─────────────────────────────
export const useResultsList = (examId, search = '') =>
  useInfiniteQuery({
    queryKey:         oasesKeys.reportResults(examId),
    queryFn:          ({ pageParam = 1 }) => reportService.listResults(examId, pageParam, search),
    getNextPageParam: (last) => last?.hasMore ? last.nextPage : undefined,
    enabled:          !!examId,
    staleTime:        1000 * 60 * 2,
    initialPageParam: 1,
  });

// ── Evaluator stats ───────────────────────────────────────────────
export const useEvaluatorStats = (examId) =>
  useQuery({
    queryKey:  oasesKeys.evalStats(examId),
    queryFn:   () => reportService.getEvaluatorStats(examId),
    enabled:   !!examId,
    staleTime: 1000 * 60 * 5,
  });

// ── Generate grades + ranks ───────────────────────────────────────
export const useGenerateResults = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (examId) => reportService.generate(examId),
    onSuccess:  (data, examId) => {
      qc.invalidateQueries({ queryKey: oasesKeys.reports(examId) });
      qc.invalidateQueries({ queryKey: oasesKeys.reportResults(examId) });
      toast.success(`Grades computed for ${data?.generated ?? 0} sheet(s).`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Generation failed.'),
  });
};

// ── Publish: decrypt rollNo + link student ────────────────────────
export const usePublishResults = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (examId) => reportService.publish(examId),
    onSuccess:  (data, examId) => {
      qc.invalidateQueries({ queryKey: oasesKeys.reports(examId) });
      qc.invalidateQueries({ queryKey: oasesKeys.reportResults(examId) });
      toast.success(`${data?.published ?? 0} result(s) published to parent portal.`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Publish failed.'),
  });
};

// ── PDF download — plain async helper (not React Query) ──────────
export const downloadPDF = async (sheetId, filename = 'result.pdf') => {
  try {
    const blob = await reportService.downloadPDF(sheetId);
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    toast.error('PDF download failed.');
  }
};
