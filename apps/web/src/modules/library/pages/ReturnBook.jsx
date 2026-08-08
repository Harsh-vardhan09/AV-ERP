import React, { useEffect, useRef, useState } from 'react';
import { FaBook, FaUndo } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useGetIssuesQuery, useReturnBookMutation } from '../api/libraryApi';
import {
  FilterCard,
  ModalFrame,
  PageHeader,
  Pagination,
  SearchField,
  StatusBadge,
  TableShell,
  formatLibraryDate,
} from '../components/LibraryUI';

const ReturnBook = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [confirmReturn, setConfirmReturn] = useState(null);
  const debounceRef = useRef();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const { data, isLoading, isFetching } = useGetIssuesQuery({
    status: 'issued',
    search: debouncedSearch,
    page,
    limit: 20,
  });
  const [returnBook, { isLoading: returning }] = useReturnBookMutation();

  const issues = data?.issues || [];
  const pagination = data?.pagination || {};

  const handleReturn = async () => {
    if (!confirmReturn) return;
    try {
      await returnBook(confirmReturn._id).unwrap();
      toast.success('Book returned successfully');
      setConfirmReturn(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Return failed');
    }
  };

  return (
    <div className="library-page">
      <PageHeader
        title="Return Book"
        subtitle={`${pagination.total ?? issues.length} active issue${(pagination.total ?? issues.length) === 1 ? '' : 's'} ready for return`}
        icon={<FaUndo />}
      />

      <FilterCard>
        <div className="library-filter-grid">
          <div className="library-field library-field-span">
            <label className="erp-label">Search Active Issues</label>
            <SearchField
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="     Search by student name or book title"
            />
          </div>
          <div className="library-filter-actions">
            <button
              className="erp-btn"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
            >
              Clear Search
            </button>
          </div>
        </div>
      </FilterCard>

      <TableShell
        loading={isLoading || isFetching}
        empty={!issues.length}
        emptyTitle="No active issues found"
        emptyDescription="Issued books waiting for return will appear here."
      >
        <table className="erp-table">
          <thead>
            <tr>
              {['Book', 'Student', 'Class', 'Issued', 'Due Date', 'Status', 'Action'].map((heading) => (
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
                  {issue.studentId?.classId?.name} - {issue.studentId?.sectionId?.name}
                </td>
                <td>{formatLibraryDate(issue.issueDate)}</td>
                <td style={{ color: issue.effectiveStatus === 'overdue' ? 'var(--color-danger)' : 'inherit', fontWeight: issue.effectiveStatus === 'overdue' ? 800 : 500 }}>
                  {formatLibraryDate(issue.dueDate)}
                </td>
                <td>
                  <StatusBadge status={issue.effectiveStatus} />
                </td>
                <td>
                  <button className="erp-btn erp-btn-primary erp-btn-sm" onClick={() => setConfirmReturn(issue)}>
                    <FaBook size={11} /> Return
                  </button>
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

      {confirmReturn && (
        <ModalFrame
          title="Mark as Returned?"
          tone="success"
          onClose={() => setConfirmReturn(null)}
          footer={
            <>
              <button className="erp-btn" onClick={() => setConfirmReturn(null)}>
                Cancel
              </button>
              <button className="erp-btn erp-btn-primary" disabled={returning} onClick={handleReturn}>
                {returning ? 'Processing...' : 'Yes, Mark Returned'}
              </button>
            </>
          }
        >
          Mark <strong>{confirmReturn.bookId?.title}</strong> as returned by{' '}
          <strong>
            {confirmReturn.studentId?.firstName} {confirmReturn.studentId?.lastName}
          </strong>
          ?
        </ModalFrame>
      )}
    </div>
  );
};

export default ReturnBook;
