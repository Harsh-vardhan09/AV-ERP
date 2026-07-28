import React from 'react';
import { Link } from 'react-router-dom';
import { FaBookOpen, FaChevronRight, FaSearch } from 'react-icons/fa';

export const formatLibraryDate = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '-';

export const getLibraryStatus = (status) => {
  const key = String(status || '').toLowerCase();
  const map = {
    available: { label: 'Available', className: 'is-success' },
    active: { label: 'Active', className: 'is-success' },
    returned: { label: 'Returned', className: 'is-success' },
    issued: { label: 'Issued', className: 'is-info' },
    due_soon: { label: 'Due Soon', className: 'is-info' },
    overdue: { label: 'Overdue', className: 'is-danger' },
    inactive: { label: 'Inactive', className: 'is-muted' },
    due_today: { label: 'Due Today', className: 'is-warning' },
    pending: { label: 'Pending', className: 'is-warning' },
  };

  return map[key] || { label: status || 'Issued', className: 'is-info' };
};

export const StatusBadge = ({ status, children, tone }) => {
  const config = tone
    ? { label: children || status, className: `is-${tone}` }
    : getLibraryStatus(status);

  return <span className={`library-status-badge ${config.className}`}>{children || config.label}</span>;
};

export const PageHeader = ({ title, subtitle, actions, icon }) => (
  <div className="library-page-header">
    <div>
      <div className="library-breadcrumb">
        <Link to="/admin/library">Library</Link>
        <FaChevronRight size={10} />
        <span>{title}</span>
      </div>
      <div className="library-title-row">
        {icon && <span className="library-title-icon">{icon}</span>}
        <div>
          <h1 className="erp-page-title">{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
    </div>
    {actions && <div className="library-page-actions">{actions}</div>}
  </div>
);

export const FilterCard = ({ children }) => (
  <div className="library-filter-card">{children}</div>
);

export const SearchField = ({ value, onChange, placeholder }) => (
  <div className="library-search-field">
    <FaSearch size={14} />
    <input
      className="erp-input"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  </div>
);

export const TableShell = ({ children, loading, empty, emptyTitle, emptyDescription }) => (
  <div className="library-table-card">
    {loading ? (
      <SkeletonTable />
    ) : empty ? (
      <EmptyState title={emptyTitle} description={emptyDescription} />
    ) : (
      <div className="responsive-table-wrap">{children}</div>
    )}
  </div>
);

export const EmptyState = ({ title = 'No records found', description = 'Try adjusting the current filters.', action }) => (
  <div className="library-empty-state">
    <div className="library-empty-icon">
      <FaBookOpen />
    </div>
    <h3>{title}</h3>
    {description && <p>{description}</p>}
    {action}
  </div>
);

export const SkeletonTable = ({ rows = 6 }) => (
  <div className="library-skeleton-table">
    {Array.from({ length: rows }).map((_, index) => (
      <div className="library-skeleton-row" key={index}>
        <span />
        <span />
        <span />
        <span />
      </div>
    ))}
  </div>
);

export const Pagination = ({ page, pages = 0, onChange, total }) => {
  if (pages <= 1 && total === undefined) return null;

  return (
    <div className="library-pagination">
      <div className="library-pagination-meta">
        {total !== undefined ? `${total} total record${total === 1 ? '' : 's'}` : null}
      </div>
      {pages > 1 && (
        <div className="library-pagination-buttons">
          <button className="erp-btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>
            Prev
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`erp-btn${p === page ? ' erp-btn-primary' : ''}`}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          ))}
          <button className="erp-btn" disabled={page >= pages} onClick={() => onChange(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export const ModalFrame = ({ title, children, footer, onClose, tone = 'primary' }) => (
  <div className="library-modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose?.()}>
    <div className="library-modal">
      <div className="library-modal-header">
        <div>
          <span className={`library-modal-kicker is-${tone}`}>{tone}</span>
          <h3>{title}</h3>
        </div>
        <button className="library-icon-button" onClick={onClose} aria-label="Close">
          x
        </button>
      </div>
      <div className="library-modal-body">{children}</div>
      {footer && <div className="library-modal-footer">{footer}</div>}
    </div>
  </div>
);
