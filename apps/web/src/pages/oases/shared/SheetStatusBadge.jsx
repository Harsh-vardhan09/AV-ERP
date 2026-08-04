// ══════════════════════════════════════════════════════════════════
// OASES — SheetStatusBadge (shared component)
// Renders a coloured pill for any SHEET_STATUS value
// ══════════════════════════════════════════════════════════════════
import React from 'react';
import { SHEET_STATUS_LABELS, SHEET_STATUS_COLORS } from '../utils/oasesConstants';

const SheetStatusBadge = ({ status, className = '' }) => {
  const label = SHEET_STATUS_LABELS[status] || status;
  const color = SHEET_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color} ${className}`}
    >
      {label}
    </span>
  );
};

export default SheetStatusBadge;
