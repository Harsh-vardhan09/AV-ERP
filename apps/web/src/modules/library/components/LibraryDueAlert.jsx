/**
 * LibraryDueAlert.jsx
 * ───────────────────
 * A non-intrusive popup that auto-appears for students when they have
 * overdue or due-soon books. Mounted globally inside DashboardLayout
 * so it shows on every page the student visits.
 *
 * Behavior:
 *  - Only renders for role === 'student'
 *  - Checks GET /api/v1/library/reminders/me on mount (RTK Query caches it)
 *  - Shows once per session (dismissed state stored in sessionStorage)
 *  - Student can click "View Library" to navigate to /student/library
 *  - Automatically dismisses after 12 seconds
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetLibraryRemindersQuery } from '../api/libraryApi';
import '@modules/library/library.css';

const SESSION_KEY = 'erp.library.alert.dismissed';

const LibraryDueAlert = () => {
  const navigate = useNavigate();
  const rawUser  = useSelector((s) => s?.user);
  // Resolve user regardless of nesting shape
  const user = rawUser?.user?.user || rawUser?.user || rawUser;
  const role = user?.role;

  const [visible, setVisible] = useState(false);

  // Only fetch for students — skip entirely for other roles
  const { data } = useGetLibraryRemindersQuery(undefined, {
    skip: role !== 'student',
    // Poll every 10 minutes (reminder data is lightweight)
    pollingInterval: 10 * 60 * 1000,
  });

  const hasReminder = data?.hasReminder;
  const items       = data?.items || [];

  const overdueItems  = items.filter(i => i.status === 'overdue');
  const dueTodayItems = items.filter(i => i.status === 'due_today');
  const dueSoonItems  = items.filter(i => i.status === 'due_soon');

  useEffect(() => {
    // Only show if there's something to report AND not already dismissed this session
    if (!hasReminder || !items.length) return;
    const dismissed = sessionStorage.getItem(SESSION_KEY);
    if (dismissed) return;
    setVisible(true);

    // Auto-dismiss after 12 seconds
    const timer = setTimeout(() => handleDismiss(), 12000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasReminder, items.length]);

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem(SESSION_KEY, '1');
  };

  const handleViewLibrary = () => {
    handleDismiss();
    navigate('/student/library');
  };

  if (!visible) return null;

  const isUrgent = overdueItems.length > 0 || dueTodayItems.length > 0;

  return (
    <div
      role="alertdialog"
      aria-modal="false"
      aria-label="Library due date reminder"
      className="fixed bottom-6 right-6 z-50 w-[340px] max-w-[calc(100vw-2rem)]
                 bg-white rounded-2xl shadow-2xl border overflow-hidden
                 animate-[slideInUp_0.35s_ease-out]"
      style={{
        borderColor: isUrgent ? '#fca5a5' : '#fcd34d',
        boxShadow: isUrgent
          ? '0 8px 32px rgba(239,68,68,0.18)'
          : '0 8px 32px rgba(245,158,11,0.18)',
      }}
    >
      {/* Colored top bar */}
      <div
        className={`h-1.5 w-full ${isUrgent ? 'bg-red-500' : 'bg-amber-400'}`}
        aria-hidden="true"
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">
              {isUrgent ? '🚨' : '📚'}
            </span>
            <div>
              <div className={`font-bold text-sm ${isUrgent ? 'text-red-700' : 'text-amber-800'}`}>
                Library Reminder
              </div>
              <div className="text-xs text-gray-500">Return books to avoid fines</div>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5 p-1 rounded"
            aria-label="Dismiss reminder"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Book list */}
        <div className="space-y-1.5 mb-4 max-h-36 overflow-y-auto">
          {overdueItems.map((item, i) => (
            <div
              key={item.issueId || `o-${i}`}
              className="flex items-center gap-2 bg-red-50 rounded-lg px-2.5 py-1.5"
            >
              <span className="text-red-500 text-xs font-bold uppercase tracking-wide">
                OVERDUE
              </span>
              <span className="text-sm text-gray-800 font-medium truncate flex-1">
                {item.bookTitle}
              </span>
              <span className="text-xs text-red-500 flex-shrink-0">
                {new Date(item.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </span>
            </div>
          ))}
          {dueTodayItems.map((item, i) => (
            <div
              key={item.issueId || `t-${i}`}
              className="flex items-center gap-2 bg-orange-50 rounded-lg px-2.5 py-1.5"
            >
              <span className="text-orange-500 text-xs font-bold uppercase tracking-wide">
                TODAY
              </span>
              <span className="text-sm text-gray-800 font-medium truncate flex-1">
                {item.bookTitle}
              </span>
            </div>
          ))}
          {dueSoonItems.map((item, i) => (
            <div
              key={item.issueId || `s-${i}`}
              className="flex items-center gap-2 bg-amber-50 rounded-lg px-2.5 py-1.5"
            >
              <span className="text-amber-600 text-xs font-bold uppercase tracking-wide">
                SOON
              </span>
              <span className="text-sm text-gray-800 font-medium truncate flex-1">
                {item.bookTitle}
              </span>
              <span className="text-xs text-amber-500 flex-shrink-0">
                {new Date(item.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleViewLibrary}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
              isUrgent
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            View Library
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default LibraryDueAlert;
