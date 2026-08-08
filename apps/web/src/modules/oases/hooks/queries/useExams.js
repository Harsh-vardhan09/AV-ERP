// ══════════════════════════════════════════════════════════════════
// OASES Hooks — Exam Config Queries (Sprint 1)
// ══════════════════════════════════════════════════════════════════
import { useQuery } from '@tanstack/react-query';
import { oasesKeys } from '../../lib/queryKeys';
import { examConfigService } from '../../services/examConfigService';

/**
 * Paginated exam configs list with optional filters.
 * @param {object} filters - { status?, academicYear?, page?, limit? }
 */
export const useExamList = (filters = {}) =>
  useQuery({
    queryKey: oasesKeys.examConfigs(filters),
    queryFn: () => examConfigService.list(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10,
  });

/** Single exam config by ID */
export const useExam = (examId) =>
  useQuery({
    queryKey: oasesKeys.examConfig(examId),
    queryFn: () => examConfigService.get(examId),
    enabled: !!examId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

// Re-export for backwards compat (Sprint 0 alias)
export const useExamConfigs = useExamList;
export const useExamConfig = useExam;
