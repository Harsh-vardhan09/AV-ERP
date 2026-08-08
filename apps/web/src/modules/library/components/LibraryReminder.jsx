import React, { useState } from 'react';
import { FaBook, FaClock, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import { useGetLibraryRemindersQuery } from '../api/libraryApi';
import { StatusBadge, formatLibraryDate } from './LibraryUI';

const STATUS_CONFIG = {
  overdue: {
    tone: 'danger',
    icon: <FaExclamationTriangle />,
    label: 'Overdue',
    title: 'Library return overdue',
  },
  due_today: {
    tone: 'warning',
    icon: <FaClock />,
    label: 'Due Today',
    title: 'Library return due today',
  },
  due_soon: {
    tone: 'info',
    icon: <FaBook />,
    label: 'Due Soon',
    title: 'Upcoming library return',
  },
};

const LibraryReminder = () => {
  const sessionKey = 'lib_reminder_dismissed';
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(sessionKey) === '1');
  const [dismissing, setDismissing] = useState(false);

  const { data, isLoading } = useGetLibraryRemindersQuery(undefined, {
    skip: dismissed,
  });

  if (dismissed || isLoading || !data?.hasReminder) return null;

  const items = data.items || [];
  const hasOverdue = items.some((item) => item.status === 'overdue');
  const hasDueToday = items.some((item) => item.status === 'due_today');
  const topStatus = hasOverdue ? 'overdue' : hasDueToday ? 'due_today' : 'due_soon';
  const cfg = STATUS_CONFIG[topStatus];

  const handleDismiss = () => {
    setDismissing(true);
    window.setTimeout(() => {
      sessionStorage.setItem(sessionKey, '1');
      setDismissed(true);
    }, 160);
  };

  return (
    <div
      className={`library-reminder is-${cfg.tone}`}
      style={dismissing ? { opacity: 0, transform: 'translateY(-6px)', transition: 'all 0.16s ease' } : undefined}
    >
      <div className="library-reminder-header">
        <div className="library-reminder-title">
          <span className={`library-stat-icon is-${cfg.tone}`}>{cfg.icon}</span>
          <div>
            <h3>{cfg.title}</h3>
            <p>Please return borrowed books to the library on time.</p>
          </div>
        </div>
        <div className="library-page-actions">
          <StatusBadge tone={cfg.tone}>{cfg.label}</StatusBadge>
          <button className="library-icon-button" onClick={handleDismiss} title="Dismiss" aria-label="Dismiss">
            <FaTimes />
          </button>
        </div>
      </div>

      <div className="library-reminder-body">
        {items.map((item) => {
          const itemConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.due_soon;
          return (
            <div key={item.issueId} className="library-reminder-item">
              <div>
                <div className="library-reminder-item-title">{item.bookTitle}</div>
                <div className="library-reminder-item-meta">
                  {item.author ? `by ${item.author} | ` : ''}Due: {formatLibraryDate(item.dueDate)}
                </div>
              </div>
              <StatusBadge tone={itemConfig.tone}>{itemConfig.label}</StatusBadge>
            </div>
          );
        })}
        <p className="library-reminder-note">
          Late returns may affect future library issuing privileges.
        </p>
      </div>
    </div>
  );
};

export default LibraryReminder;
