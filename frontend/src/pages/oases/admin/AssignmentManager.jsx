// ══════════════════════════════════════════════════════════════════
// OASES — Admin: AssignmentManager page (scaffold)
// SCHOOL_ADMIN selects unassigned sheets → picks evaluator → assigns
// ══════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { ClipboardList, Loader2 } from 'lucide-react';
import { useUnassignedSheets } from '../hooks/queries/useSheets';
import { useAssignSheets } from '../hooks/mutations/useAssignSheet';
import OasesRoleGuard from '../shared/OasesRoleGuard';
import SheetStatusBadge from '../shared/SheetStatusBadge';
import { OASES_ROLES } from '../utils/oasesConstants';

const AssignmentManager = () => {
  const [selectedExamConfigId, setSelectedExamConfigId] = useState('');
  const { data, isLoading } = useUnassignedSheets(selectedExamConfigId);
  const assignMutation = useAssignSheets();

  const unassigned = data?.sheets || [];

  return (
    <OasesRoleGuard roles={[OASES_ROLES.SCHOOL_ADMIN]}>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <ClipboardList className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">Assignment Manager</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Select an exam config, pick unassigned sheets, choose an evaluator, and click Assign.
        </p>

        {/* Exam config selector — Sprint 1 replaces with select from API */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Enter Exam Config ID (Sprint 1: replace with dropdown)"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={selectedExamConfigId}
            onChange={(e) => setSelectedExamConfigId(e.target.value)}
          />
        </div>

        {/* Unassigned sheets */}
        {isLoading ? (
          <div className="flex justify-center h-32 items-center text-blue-400">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
        ) : unassigned.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No unassigned sheets found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {unassigned.map((sheet) => (
              <div
                key={sheet._id}
                className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm"
              >
                <div>
                  <p className="font-mono text-sm font-medium text-gray-700">
                    {sheet.anonymousCode}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Pages: {sheet.totalPages} &nbsp;·&nbsp; Set: {sheet.set}
                  </p>
                </div>
                <SheetStatusBadge status={sheet.processingStatus === 'done' ? 'uploaded' : sheet.processingStatus} />
              </div>
            ))}
          </div>
        )}

        {/* Assign button stub */}
        {unassigned.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center text-sm text-gray-500">
            🚧 Sprint 1: Evaluator selector + bulk assign action goes here
          </div>
        )}
      </div>
    </OasesRoleGuard>
  );
};

export default AssignmentManager;
