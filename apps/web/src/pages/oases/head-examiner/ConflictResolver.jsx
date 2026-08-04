// ══════════════════════════════════════════════════════════════════
// OASES — Head Examiner: ConflictResolver page (scaffold)
// HEAD_EXAMINER views both evaluations side-by-side and resolves.
// ══════════════════════════════════════════════════════════════════
import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import OasesRoleGuard from '../shared/OasesRoleGuard';
import SheetStatusBadge from '../shared/SheetStatusBadge';
import { OASES_ROLES } from '../utils/oasesConstants';
import { oasesKeys } from '../lib/queryKeys';
import { conflictService } from '../services/adminService';

const ConflictResolver = () => {
  const { data, isLoading } = useQuery({
    queryKey: oasesKeys.conflicts('all'),
    queryFn:  () => conflictService.list(),
    staleTime: 1000 * 60,
    gcTime:    1000 * 60 * 5,
  });

  const sheets = data?.sheets || [];

  return (
    <OasesRoleGuard roles={[OASES_ROLES.HEAD_EXAMINER, OASES_ROLES.SCHOOL_ADMIN]}>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
          <h2 className="text-2xl font-bold text-gray-800">Conflict Resolution</h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center h-40 items-center text-amber-400">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
        ) : sheets.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-25" />
            <p>No conflict sheets found. All evaluations are consistent! ✅</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sheets.map((sheet) => (
              <div
                key={sheet._id}
                className="flex items-center justify-between p-4 bg-white rounded-xl border border-amber-100 shadow-sm hover:shadow-md transition"
              >
                <div>
                  <p className="font-mono text-sm font-semibold text-gray-700">
                    {sheet.anonymousCode}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {sheet.examConfigId?.subject} &nbsp;·&nbsp;
                    Conflict Margin: ±{sheet.examConfigId?.conflictMargin}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <SheetStatusBadge status={sheet.status} />
                  <button className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition">
                    Review →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center text-xs text-gray-400">
          🚧 Sprint 1: Side-by-side mark comparison + override form renders here.
        </div>
      </div>
    </OasesRoleGuard>
  );
};

export default ConflictResolver;
