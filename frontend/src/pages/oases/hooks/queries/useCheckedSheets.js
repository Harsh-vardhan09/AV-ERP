// ══════════════════════════════════════════════════════════════════
// OASES Hook — useCheckedSheets (admin view)
// Fetches checked/submitted/locked sheets for the admin dashboard.
// ══════════════════════════════════════════════════════════════════
import { useQuery } from '@tanstack/react-query';
import { uploadService } from '../../services/uploadService';

/**
 * Admin: list of evaluated sheets (checked copies)
 * @param {object} filters  { examId?, classId?, subjectId?, page?, limit? }
 */
export const useCheckedSheets = (filters = {}) =>
  useQuery({
    queryKey:  ['oases', 'checked-sheets', filters],
    queryFn:   () => uploadService.listCheckedSheets(filters),
    staleTime: 1000 * 30,
    gcTime:    1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });

export default useCheckedSheets;
