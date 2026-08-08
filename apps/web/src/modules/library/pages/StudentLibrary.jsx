import React from 'react';
import { useGetLibraryRemindersQuery } from '../api/libraryApi';
import { AlertTriangle, BookOpen, Info, Book } from 'lucide-react';

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

const statusBadge = (status) => {
  if (status === 'overdue')
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border bg-rose-50 text-rose-700 border-rose-200">
        Overdue
      </span>
    );
  if (status === 'due_today')
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border bg-orange-50 text-orange-700 border-orange-200">
        Due Today
      </span>
    );
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200">
      Due Soon
    </span>
  );
};

const StudentLibrary = () => {
  const { data: reminderData, isLoading, isError } = useGetLibraryRemindersQuery();

  const reminderItems = reminderData?.items || [];
  const hasReminder   = reminderData?.hasReminder;

  // Compute summary stats
  const overdueCount  = reminderItems.filter(i => i.status === 'overdue').length;
  const dueTodayCount = reminderItems.filter(i => i.status === 'due_today').length;
  const dueSoonCount  = reminderItems.filter(i => i.status === 'due_soon').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 pb-10">
      
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          My Library
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Books issued to you — track due dates and avoid late returns
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-rose-500 px-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-rose-400" />
          <p className="text-sm font-semibold">Failed to load library data</p>
        </div>
      ) : reminderItems.length === 0 ? (
        /* Empty State shown as the main page content, centered and responsive */
        <div className="flex flex-col items-center justify-center min-h-[60vh] py-12 text-center space-y-5 px-4">
          <img 
            src="/assets/libraray.svg" 
            alt="No issued books" 
            className="h-36 sm:h-28 w-auto opacity-75 object-contain grayscale"
          />
          <div>
            <p className="font-bold text-slate-700 text-sm">All clear!</p>
            <p className="text-xs text-slate-400 mt-1.5">You have no overdue or upcoming-due books right now</p>
          </div>
        </div>
      ) : (
        <>
          {/* Alert Banner — shows only when there are overdue/due-soon items */}
          {hasReminder && (
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 shadow-xs animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-bold text-amber-900 text-sm">
                  Attention Required — Library Reminder
                </div>
                <div className="text-amber-800 text-xs sm:text-sm mt-2 space-y-1.5 font-medium">
                  {overdueCount > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span>
                        <strong>{overdueCount}</strong> book{overdueCount !== 1 ? 's are' : ' is'}{' '}
                        <span className="text-rose-600 font-bold">overdue</span>. Please return immediately.
                      </span>
                    </div>
                  )}
                  {dueTodayCount > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <span>
                        <strong>{dueTodayCount}</strong> book{dueTodayCount !== 1 ? 's are' : ' is'} due{' '}
                        <span className="font-bold">today</span>.
                      </span>
                    </div>
                  )}
                  {dueSoonCount > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>
                        <strong>{dueSoonCount}</strong> book{dueSoonCount !== 1 ? 's are' : ' is'} due within the next 2 days.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-center shadow-xs">
              <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight tabular-nums">{overdueCount}</div>
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Overdue</div>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-center shadow-xs">
              <div className="text-2xl sm:text-3xl font-extrabold text-orange-500 tracking-tight tabular-nums">{dueTodayCount}</div>
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Due Today</div>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-center shadow-xs">
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-500 tracking-tight tabular-nums">{dueSoonCount}</div>
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Due Soon</div>
            </div>
          </div>

          {/* Issued Books Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Books Requiring Attention
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-400">{reminderItems.length} records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/30 text-left text-xs text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-5">Book Details</th>
                    <th className="py-3.5 px-5 text-center">Due Date</th>
                    <th className="py-3.5 px-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {reminderItems.map((item, idx) => (
                    <tr
                      key={item.issueId || idx}
                      className={`transition-colors ${
                        item.status === 'overdue'
                          ? 'bg-rose-50/40 hover:bg-rose-100/40 text-rose-950'
                          : item.status === 'due_today'
                          ? 'bg-orange-50/40 hover:bg-orange-100/40 text-orange-950'
                          : 'bg-amber-50/40 hover:bg-amber-100/40 text-amber-950'
                      }`}
                    >
                      {/* Book */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-11 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 border border-slate-200 text-slate-500">
                            <Book className="w-4 h-4 text-slate-400" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 leading-tight">
                              {item.bookTitle}
                            </div>
                            {item.author && (
                              <div className="text-xs text-slate-400 mt-0.5 font-medium">{item.author}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-5 text-center">
                        <div
                          className={`font-bold text-sm tabular-nums ${
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
                          <div className="text-[10px] text-red-400 mt-0.5 font-semibold uppercase tracking-wider">
                            {Math.abs(daysLeft(item.dueDate))} day(s) overdue
                          </div>
                        )}
                        {item.status === 'due_today' && (
                          <div className="text-[10px] text-orange-400 mt-0.5 font-semibold uppercase tracking-wider">Return today!</div>
                        )}
                        {item.status === 'due_soon' && (
                          <div className="text-[10px] text-amber-600 mt-0.5 font-semibold uppercase tracking-wider">
                            {daysLeft(item.dueDate)} day(s) left
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-5 text-center">
                        {statusBadge(item.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info note */}
          <div className="flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200/50 rounded-xl p-3 text-xs text-slate-400 max-w-2xl mx-auto">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <p className="font-medium">
              This page lists books requiring immediate attention. Visit the physical library counter for full issuance logs.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentLibrary;
