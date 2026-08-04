/**
 * Payroll Formatters — shared utilities for all payroll pages
 */
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Format a number as Indian Rupee — ₹1,23,456 */
export const formatINR = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/** Format month (1-12) + year → "April 2026" */
export const formatMonth = (month, year) => {
  if (!month || !year) return '—';
  return `${MONTHS[month - 1]} ${year}`;
};

/** Map status string → Ant Design Tag color */
export const getStatusColor = (status) => {
  const map = {
    draft: 'default',
    processing: 'processing',
    processed: 'warning',
    approved: 'success',
    locked: 'purple',
    cancelled: 'error',
    pending: 'orange',
    paid: 'green',
    failed: 'red',
    finalised: 'blue',
    sent: 'green',
    generated: 'cyan',
    submitted: 'geekblue',
  };
  return map[status] || 'default';
};

/** Map status string → human-readable label */
export const getStatusLabel = (status) => {
  const map = {
    draft: 'Draft',
    processing: 'Processing',
    processed: 'Processed',
    approved: 'Approved',
    locked: 'Locked',
    cancelled: 'Cancelled',
    pending: 'Pending',
    paid: 'Paid',
    failed: 'Failed',
    finalised: 'Finalised',
    sent: 'Sent',
    generated: 'Generated',
    submitted: 'Submitted',
    'N/A': 'N/A',
  };
  return map[status] || status || '—';
};

/** Format a number of days → "5 days" */
export const getDaysLabel = (days) => {
  if (days === null || days === undefined) return '0 days';
  return `${days} day${Number(days) !== 1 ? 's' : ''}`;
};
