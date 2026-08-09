// ══════════════════════════════════════════════════════════════════
// OASES Hook — useAuditLog (Sprint 4)
// Infinite query for a sheet's entity audit trail.
// Works with AuditTrailDrawer's Load More button.
// ══════════════════════════════════════════════════════════════════
import { useInfiniteQuery } from '@tanstack/react-query';
import { oasesKeys } from '../../lib/queryKeys';
import { auditService } from '../../services/adminService';

/**
 * Infinite audit log for a specific entity (e.g. a sheet).
 * Each page: { logs:[], hasMore, nextPage, total }
 */
export const useAuditLog = (entityId) =>
  useInfiniteQuery({
    queryKey: oasesKeys.auditEntity(entityId),
    queryFn: ({ pageParam = 1 }) => auditService.getEntityTrail(entityId, pageParam),
    getNextPageParam: (lastPage) => (lastPage?.hasMore ? lastPage.nextPage : undefined),
    enabled: !!entityId,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,
    initialPageParam: 1,
  });
