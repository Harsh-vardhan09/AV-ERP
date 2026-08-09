import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaExclamationTriangle } from 'react-icons/fa';
import { useGetIssuesQuery } from '../api/libraryApi';
import {
  EmptyState,
  PageHeader,
  Pagination,
  StatusBadge,
  TableShell,
  formatLibraryDate,
} from '../components/LibraryUI';

const daysOverdue = (dueDate) => {
  const diff = Math.floor((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
};

const OverdueBooks = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useGetIssuesQuery({ status: 'overdue', page, limit: 20 });
  const issues = data?.issues || [];
  const pagination = data?.pagination || {};

  return (
    <div className="library-page">
      <PageHeader
        title="Overdue Books"
        subtitle={`${pagination.total ?? issues.length} overdue record${(pagination.total ?? issues.length) === 1 ? '' : 's'} found`}
        icon={<FaExclamationTriangle />}
        actions={
          pagination.total > 0 ? (
            <StatusBadge tone="danger">{pagination.total} overdue</StatusBadge>
          ) : null
        }
      />

      {!isLoading && pagination.total === 0 ? (
        <div className="library-section-card">
          <EmptyState
            title="No overdue books"
            description="All issued books are currently within their due dates."
            action={
              <Link to="/admin/library/issued" className="erp-btn erp-btn-primary">
                View All Issues
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="library-alert">
            <FaExclamationTriangle />
            <span>These books are past their due date. Contact students to arrange immediate return.</span>
          </div>

          <TableShell
            loading={isLoading || isFetching}
            empty={!issues.length}
            emptyTitle="No overdue books"
            emptyDescription="Overdue issue records will appear here."
          >
            <table className="erp-table">
              <thead>
                <tr>
                  {['Book', 'Student', 'Class', 'Issue Date', 'Due Date', 'Days Overdue', 'Action'].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => {
                  const days = daysOverdue(issue.dueDate);
                  return (
                    <tr key={issue._id}>
                      <td className="library-book-cell">
                        <div className="library-primary-text">{issue.bookId?.title}</div>
                        <div className="library-muted-text">{issue.bookId?.author}</div>
                      </td>
                      <td className="library-user-cell">
                        <div className="library-primary-text">
                          {issue.studentId?.firstName} {issue.studentId?.lastName}
                        </div>
                        <div className="library-muted-text">{issue.studentId?.admissionNumber}</div>
                      </td>
                      <td>
                        {issue.studentId?.classId?.name} - {issue.studentId?.sectionId?.name}
                      </td>
                      <td>{formatLibraryDate(issue.issueDate)}</td>
                      <td style={{ color: 'var(--color-danger)', fontWeight: 800 }}>
                        {formatLibraryDate(issue.dueDate)}
                      </td>
                      <td>
                        <StatusBadge tone={days > 30 ? 'danger' : 'warning'}>
                          {days} day{days !== 1 ? 's' : ''}
                        </StatusBadge>
                      </td>
                      <td>
                        <Link to="/admin/library/return" className="erp-btn erp-btn-primary erp-btn-sm">
                          Return
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableShell>

          <Pagination
            page={page}
            pages={pagination.pages}
            total={pagination.total}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
};

export default OverdueBooks;
