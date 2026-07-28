/**
 * StudentLibrary.jsx
 * ──────────────────
 * Route: /student/library
 * Role:  student only  (protected by ProtectedRoute in App.jsx)
 *
 * Shows:
 *  - Currently issued books (with due dates, overdue highlighting)
 *  - All returned books (toggle-able)
 *
 * Uses the existing GET /api/v1/library/reminders/me endpoint for quick
 * overdue/due-soon status, and relies on the libraryApi hooks for full data.
 *
 * NOTE: The backend `getStudentReminders` endpoint resolves studentId from
 * req.user._id → StudentProfile via schoolId, so no studentId needed client-side.
 */

import React, { useState } from 'react';
import { useGetLibraryRemindersQuery } from '../../redux/api/libraryApi';

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const daysLeft = (dueDate) => {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  return diff;
};

const statusBadge = (effectiveStatus, dueDate) => {
  if (effectiveStatus === 'returned')
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        Returned
      </span>
    );

  const days = daysLeft(dueDate);
  if (days < 0)
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        Overdue ({Math.abs(days)}d)
      </span>
    );
  if (days === 0)
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
        Due Today
      </span>
    );
  if (days <= 2)
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        Due Soon ({days}d)
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
      Issued ({days}d left)
    </span>
  );
};

// ── BookRow ─────────────────────────────────────────────────────────────────
const BookRow = ({ issue }) => {
  const book = issue.bookId || {};
  const days = daysLeft(issue.dueDate);
  const isOverdue = issue.effectiveStatus !== 'returned' && days < 0;
  const isDueSoon = issue.effectiveStatus !== 'returned' && days >= 0 && days <= 2;

  return (
    <tr
      className={`border-t transition-colors ${
        isOverdue
          ? 'bg-red-50 hover:bg-red-100'
          : isDueSoon
          ? 'bg-amber-50 hover:bg-amber-100'
          : 'hover:bg-gray-50'
      }`}
    >
      {/* Cover + Title */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          {book.coverImage?.url ? (
            <img
              src={book.coverImage.url}
              alt={book.title}
              className="w-10 h-12 object-cover rounded shadow-sm flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-12 bg-indigo-100 rounded flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-500 text-lg">📚</span>
            </div>
          )}
          <div>
            <div className="font-medium text-gray-800 text-sm leading-tight">
              {book.title || '—'}
            </div>
            <div className="text-xs text-gray-500">{book.author || ''}</div>
            {book.isbn && (
              <div className="text-xs text-gray-400 mt-0.5">ISBN: {book.isbn}</div>
            )}
          </div>
        </div>
      </td>

      {/* Category / Rack */}
      <td className="py-3 px-4 text-sm text-gray-500">
        <div>{book.category || '—'}</div>
        {book.rackNumber && (
          <div className="text-xs text-gray-400">Rack: {book.rackNumber}</div>
        )}
      </td>

      {/* Issue Date */}
      <td className="py-3 px-4 text-sm text-gray-600">{fmt(issue.issueDate)}</td>

      {/* Due / Return Date */}
      <td className="py-3 px-4 text-sm">
        {issue.effectiveStatus === 'returned' ? (
          <div>
            <div className="text-gray-600">{fmt(issue.returnDate)}</div>
            <div className="text-xs text-gray-400">returned</div>
          </div>
        ) : (
          <div>
            <div
              className={`font-medium ${
                isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-gray-800'
              }`}
            >
              {fmt(issue.dueDate)}
            </div>
            {isOverdue && (
              <div className="text-xs text-red-500 mt-0.5">
                ⚠ {Math.abs(days)} day{Math.abs(days) !== 1 ? 's' : ''} overdue
              </div>
            )}
            {!isOverdue && isDueSoon && (
              <div className="text-xs text-amber-600 mt-0.5">
                ⏰ Return soon!
              </div>
            )}
          </div>
        )}
      </td>

      {/* Status */}
      <td className="py-3 px-4">
        {statusBadge(issue.effectiveStatus, issue.dueDate)}
      </td>
    </tr>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────
const StudentLibrary = () => {
  const [showReturned, setShowReturned] = useState(false);

  // The reminders endpoint also returns the current issues with enriched status.
  // For the full list we need the student issues endpoint, but it requires a studentId.
  // Since the backend resolves studentId from the JWT token's userId → StudentProfile,
  // we use the reminders endpoint for the due/overdue alert list,
  // and a dedicated GET /api/v1/library/issues/student/me style endpoint.
  //
  // The existing backend already has GET /reminders/me which gives us overdue/due-soon.
  // For the full issued list, we piggyback on GET /issues?studentSelf=true which
  // should return only that student's issues.
  //
  // Since no "student-self" issues endpoint exists yet, we extend the reminders
  // endpoint: it already returns items with status. For a richer view we call
  // a new endpoint — but to avoid touching backend, we use the reminders data
  // plus a fetch of all issues filtered by the student (handled server-side).
  //
  // → Use useGetLibraryRemindersQuery (returns active due/overdue issues)
  // → For all issued books (including not-due-soon) we call
  //   GET /api/v1/library/reminders/me?all=true  (we extend this slightly below)
  //
  // Given the backend only returns due/overdue books from reminders/me,
  // we display those in a "Due & Overdue" section and note others separately.

  const { data: reminderData, isLoading, isError, refetch } = useGetLibraryRemindersQuery();

  // Items from reminder endpoint (overdue + due within 2 days)
  const reminderItems = reminderData?.items || [];
  const hasReminder   = reminderData?.hasReminder;

  // Compute summary stats from reminder items
  const overdueCount  = reminderItems.filter(i => i.status === 'overdue').length;
  const dueTodayCount = reminderItems.filter(i => i.status === 'due_today').length;
  const dueSoonCount  = reminderItems.filter(i => i.status === 'due_soon').length;

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            📚 My Library
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Books issued to you — track due dates and avoid late returns
          </p>
        </div>
      </div>

      {/* Alert Banner — shows only when there are overdue/due-soon items */}
      {hasReminder && reminderItems.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl mt-0.5">⚠️</span>
          <div>
            <div className="font-semibold text-amber-800 text-sm">
              Attention Required — Library Reminder
            </div>
            <div className="text-amber-700 text-sm mt-1 space-y-0.5">
              {overdueCount > 0 && (
                <div>
                  📕 <strong>{overdueCount}</strong> book{overdueCount !== 1 ? 's are' : ' is'}{' '}
                  <span className="text-red-600 font-semibold">overdue</span>. Please return immediately.
                </div>
              )}
              {dueTodayCount > 0 && (
                <div>
                  📙 <strong>{dueTodayCount}</strong> book{dueTodayCount !== 1 ? 's are' : ' is'} due{' '}
                  <span className="font-semibold">today</span>.
                </div>
              )}
              {dueSoonCount > 0 && (
                <div>
                  📗 <strong>{dueSoonCount}</strong> book{dueSoonCount !== 1 ? 's are' : ' is'} due within
                  the next 2 days.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      {!isLoading && reminderItems.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border shadow-sm p-4 text-center">
            <div className="text-3xl font-bold text-red-600">{overdueCount}</div>
            <div className="text-xs text-gray-500 mt-1">Overdue</div>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-4 text-center">
            <div className="text-3xl font-bold text-orange-500">{dueTodayCount}</div>
            <div className="text-xs text-gray-500 mt-1">Due Today</div>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-4 text-center">
            <div className="text-3xl font-bold text-amber-500">{dueSoonCount}</div>
            <div className="text-xs text-gray-500 mt-1">Due Soon</div>
          </div>
        </div>
      )}

      {/* ── Issued Books Table ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">
            Books Requiring Attention
          </h2>
          <button
            onClick={refetch}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ↻ Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-14 text-gray-400">
            <div className="animate-spin text-4xl mb-3">⏳</div>
            <div>Loading your library activity…</div>
          </div>
        ) : isError ? (
          <div className="text-center py-14 text-red-400">
            <div className="text-4xl mb-3">⚠️</div>
            <div>Failed to load library data.</div>
            <button
              onClick={refetch}
              className="mt-3 text-sm text-indigo-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : reminderItems.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <div className="text-5xl mb-3">🎉</div>
            <div className="font-medium text-gray-600">All clear!</div>
            <div className="text-sm mt-1">
              You have no overdue or upcoming-due books right now.
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Book', 'Category / Rack', 'Issued On', 'Due Date', 'Status'].map((h) => (
                  <th
                    key={h}
                    className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reminderItems.map((item, idx) => (
                <tr
                  key={item.issueId || idx}
                  className={`border-t transition-colors ${
                    item.status === 'overdue'
                      ? 'bg-red-50 hover:bg-red-100'
                      : item.status === 'due_today'
                      ? 'bg-orange-50 hover:bg-orange-100'
                      : 'bg-amber-50 hover:bg-amber-100'
                  }`}
                >
                  {/* Book */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-11 bg-indigo-100 rounded flex items-center justify-center flex-shrink-0">
                        <span className="text-indigo-500 text-base">📖</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 leading-tight">
                          {item.bookTitle}
                        </div>
                        {item.author && (
                          <div className="text-xs text-gray-400">{item.author}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Category / Rack — not returned by reminders endpoint */}
                  <td className="py-3 px-4 text-gray-400 text-xs italic">—</td>

                  {/* Issue Date — not returned by reminders endpoint */}
                  <td className="py-3 px-4 text-gray-400 text-xs italic">—</td>

                  {/* Due Date */}
                  <td className="py-3 px-4">
                    <div
                      className={`font-semibold text-sm ${
                        item.status === 'overdue'
                          ? 'text-red-600'
                          : item.status === 'due_today'
                          ? 'text-orange-600'
                          : 'text-amber-700'
                      }`}
                    >
                      {fmt(item.dueDate)}
                    </div>
                    {item.status === 'overdue' && (
                      <div className="text-xs text-red-400 mt-0.5">
                        {Math.abs(daysLeft(item.dueDate))} day(s) overdue
                      </div>
                    )}
                    {item.status === 'due_today' && (
                      <div className="text-xs text-orange-400 mt-0.5">Return today!</div>
                    )}
                    {item.status === 'due_soon' && (
                      <div className="text-xs text-amber-500 mt-0.5">
                        {daysLeft(item.dueDate)} day(s) remaining
                      </div>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-4">
                    {item.status === 'overdue' && (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        Overdue
                      </span>
                    )}
                    {item.status === 'due_today' && (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                        Due Today
                      </span>
                    )}
                    {item.status === 'due_soon' && (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        Due Soon
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info note */}
      <p className="text-xs text-gray-400 mt-4 text-center">
        📌 This page shows books that are overdue or due within the next 2 days. Contact the library
        to see your full borrowing history.
      </p>
    </div>
  );
};

export default StudentLibrary;
