import React, { useState } from 'react';
import { FaBookOpen } from 'react-icons/fa';
import { useGetIssuesQuery } from '../../redux/api/libraryApi';
import {
  FilterCard,
  PageHeader,
  Pagination,
  StatusBadge,
  TableShell,
  formatLibraryDate,
} from '../../components/library/LibraryUI';

const IssuedBooks = () => {
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useGetIssuesQuery({
    status,
    dateFrom,
    dateTo,
    page,
    limit: 20,
  });
  const issues = data?.issues || [];
  const pagination = data?.pagination || {};

  const resetFilters = () => {
    setStatus('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div className="library-page">
      <PageHeader
        title="All Issued Books"
        subtitle={`${pagination.total ?? issues.length} issue record${(pagination.total ?? issues.length) === 1 ? '' : 's'} found`}
        icon={<FaBookOpen />}
      />

      <FilterCard>
        <div className="library-filter-grid">
          <div className="library-field">
            <label className="erp-label">Status</label>
            <select
              className="erp-select"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="issued">Issued</option>
              <option value="returned">Returned</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div className="library-field">
            <label className="erp-label">From</label>
            <input
              type="date"
              className="erp-input"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="library-field">
            <label className="erp-label">To</label>
            <input
              type="date"
              className="erp-input"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="library-filter-actions">
            <button className="erp-btn" onClick={resetFilters}>
              Reset
            </button>
          </div>
        </div>
      </FilterCard>

      <TableShell
        loading={isLoading || isFetching}
        empty={!issues.length}
        emptyTitle="No issue records found"
        emptyDescription="Try changing the status or date range."
      >
        <table className="erp-table">
          <thead>
            <tr>
              {['Book', 'Student', 'Class', 'Issued', 'Due Date', 'Returned', 'Status'].map((heading) => (
                <th key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
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
                  {issue.studentId?.classId?.name} {issue.studentId?.sectionId?.name}
                </td>
                <td>{formatLibraryDate(issue.issueDate)}</td>
                <td style={{ color: issue.effectiveStatus === 'overdue' ? 'var(--color-danger)' : 'inherit', fontWeight: issue.effectiveStatus === 'overdue' ? 800 : 500 }}>
                  {formatLibraryDate(issue.dueDate)}
                </td>
                <td>{formatLibraryDate(issue.returnDate)}</td>
                <td>
                  <StatusBadge status={issue.effectiveStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      <Pagination
        page={page}
        pages={pagination.pages}
        total={pagination.total}
        onChange={setPage}
      />
    </div>
  );
};

export default IssuedBooks;
