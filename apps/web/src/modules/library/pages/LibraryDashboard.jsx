import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaBook,
  FaBookOpen,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPlus,
} from 'react-icons/fa';
import { useGetLibraryDashboardQuery } from '../api/libraryApi';
import {
  EmptyState,
  PageHeader,
  StatusBadge,
  TableShell,
  formatLibraryDate,
} from '../components/LibraryUI';

const StatCard = ({ icon, label, value, sub, tone }) => (
  <div className="library-stat-card">
    <div className={`library-stat-icon is-${tone}`}>{icon}</div>
    <div>
      <p className="library-stat-label">{label}</p>
      <p className="library-stat-value">{value}</p>
      <p className="library-stat-sub">{sub}</p>
    </div>
  </div>
);

const ActivityTable = ({ title, link, columns, rows, emptyTitle, emptyDescription }) => (
  <div className="library-section-card">
    <div className="library-section-header">
      <h2>{title}</h2>
      <Link to={link}>View all</Link>
    </div>
    <div>
      {!rows?.length ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="responsive-table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
      )}
    </div>
  </div>
);

const LibraryDashboard = () => {
  const { data, isLoading, isFetching } = useGetLibraryDashboardQuery();
  const d = data?.data || {};

  const stats = [
    {
      icon: <FaBook />,
      label: 'Total Books',
      value: d.totalBooks ?? 0,
      sub: `${d.availableBooks ?? 0} available`,
      tone: 'info',
    },
    {
      icon: <FaBookOpen />,
      label: 'Currently Issued',
      value: d.totalIssued ?? 0,
      sub: 'Active issues',
      tone: 'warning',
    },
    {
      icon: <FaExclamationTriangle />,
      label: 'Overdue Books',
      value: d.overdueCount ?? 0,
      sub: 'Need attention',
      tone: 'danger',
    },
    {
      icon: <FaCheckCircle />,
      label: 'Available Copies',
      value: d.availableBooks ?? 0,
      sub: 'Ready to issue',
      tone: 'success',
    },
  ];

  return (
    <div className="library-page">
      <PageHeader
        title="Library Dashboard"
        subtitle="Book inventory, issue activity, and return updates at a glance"
        icon={<FaBookOpen />}
        actions={
          <>
            {/* <Link to="../admin/library/" className="erp-btn erp-btn-primary">
              <FaPlus size={12} /> Issue Book
            </Link> */}
            {/* <Link to="/admin/library/books" className="erp-btn">
              Manage Books
            </Link> */}
          </>
        }
      />

      <div className="library-stats-grid">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {isLoading || isFetching ? (
        <TableShell loading />
      ) : (
        <div className="library-dashboard-grid">
          <ActivityTable
            title="Recent Issues"
            link="/admin/library/issued"
            columns={['Book', 'Student', 'Due', 'Status']}
            emptyTitle="No recent issues"
            emptyDescription="Newly issued books will appear here."
            rows={d.recentIssued?.slice(0, 6).map((issue) => (
              <tr key={issue._id || `${issue.bookId?._id}-${issue.studentId?._id}`}>
                <td className="library-book-cell">
                  <div className="library-primary-text">{issue.bookId?.title || '-'}</div>
                  <div className="library-muted-text">{issue.bookId?.author || 'Unknown author'}</div>
                </td>
                <td className="library-user-cell">
                  <div className="library-primary-text">
                    {issue.studentId?.firstName} {issue.studentId?.lastName}
                  </div>
                  <div className="library-muted-text">{issue.studentId?.admissionNumber || '-'}</div>
                </td>
                <td>{formatLibraryDate(issue.dueDate)}</td>
                <td>
                  <StatusBadge status={issue.effectiveStatus} />
                </td>
              </tr>
            ))}
          />

          <ActivityTable
            title="Recently Returned"
            link="/admin/library/issued"
            columns={['Book', 'Student', 'Returned On']}
            emptyTitle="No recent returns"
            emptyDescription="Returned books will be listed here."
            rows={d.recentReturned?.slice(0, 6).map((issue) => (
              <tr key={issue._id || `${issue.bookId?._id}-${issue.returnDate}`}>
                <td className="library-book-cell">
                  <div className="library-primary-text">{issue.bookId?.title || '-'}</div>
                  <div className="library-muted-text">{issue.bookId?.author || 'Unknown author'}</div>
                </td>
                <td className="library-user-cell">
                  <div className="library-primary-text">
                    {issue.studentId?.firstName} {issue.studentId?.lastName}
                  </div>
                  <div className="library-muted-text">{issue.studentId?.admissionNumber || '-'}</div>
                </td>
                <td>{formatLibraryDate(issue.returnDate)}</td>
              </tr>
            ))}
          />
        </div>
      )}
    </div>
  );
};

export default LibraryDashboard;
