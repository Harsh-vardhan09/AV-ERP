import React, { useEffect, useRef, useState } from 'react';
import { FaBook, FaCheckCircle, FaTimes, FaUser } from 'react-icons/fa';
import toast from 'react-hot-toast';
import {
  useIssueBookMutation,
  useSearchBooksQuery,
  useSearchLibraryStudentsQuery,
} from '../api/libraryApi';
import {
  PageHeader,
  SearchField,
  StatusBadge,
  formatLibraryDate,
} from '../components/LibraryUI';

const today = () => new Date().toISOString().slice(0, 10);

const defaultDue = () => {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
};

const IssueBook = () => {
  const [studentQ, setStudentQ] = useState('');
  const [bookQ, setBookQ] = useState('');
  const [debouncedSQ, setDebouncedSQ] = useState('');
  const [debouncedBQ, setDebouncedBQ] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState(defaultDue());
  const [remarks, setRemarks] = useState('');
  const [success, setSuccess] = useState(false);
  const sRef = useRef();
  const bRef = useRef();

  useEffect(() => {
    clearTimeout(sRef.current);
    sRef.current = setTimeout(() => setDebouncedSQ(studentQ), 400);
    return () => clearTimeout(sRef.current);
  }, [studentQ]);

  useEffect(() => {
    clearTimeout(bRef.current);
    bRef.current = setTimeout(() => setDebouncedBQ(bookQ), 400);
    return () => clearTimeout(bRef.current);
  }, [bookQ]);

  const { data: studData, isFetching: sLoading } = useSearchLibraryStudentsQuery(debouncedSQ, {
    skip: debouncedSQ.length < 2,
  });
  const { data: bookData, isFetching: bLoading } = useSearchBooksQuery(debouncedBQ, {
    skip: debouncedBQ.length < 2,
  });
  const [issueBook, { isLoading: issuing }] = useIssueBookMutation();

  const students = studData?.data || [];
  const books = bookData?.data || [];

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setStudentQ(`${student.firstName} ${student.lastName} - ${student.admissionNumber}`);
  };

  const handleSelectBook = (book) => {
    setSelectedBook(book);
    setBookQ(`${book.title} by ${book.author}`);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedStudent || !selectedBook) return toast.error('Select both student and book');

    try {
      await issueBook({
        studentId: selectedStudent._id,
        bookId: selectedBook._id,
        issueDate,
        dueDate,
        remarks,
      }).unwrap();
      setSuccess(true);
      toast.success('Book issued successfully!');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to issue book');
    }
  };

  const resetForm = () => {
    setSelectedStudent(null);
    setSelectedBook(null);
    setStudentQ('');
    setBookQ('');
    setIssueDate(today());
    setDueDate(defaultDue());
    setRemarks('');
    setSuccess(false);
  };

  if (success) {
    return (
      <div className="library-page">
        <PageHeader
          title="Issue Book"
          subtitle="The issue transaction has been recorded"
          icon={<FaBook />}
        />
        <div className="library-success-panel">
          <div className="library-success-card">
            <FaCheckCircle size={58} />
            <h2>Book Issued Successfully</h2>
            <p>
              <strong>{selectedBook?.title}</strong> has been issued to{' '}
              <strong>
                {selectedStudent?.firstName} {selectedStudent?.lastName}
              </strong>
              . Due date: <strong>{formatLibraryDate(dueDate)}</strong>.
            </p>
            <button className="erp-btn erp-btn-primary" onClick={resetForm}>
              Issue Another Book
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="library-page">
      <PageHeader
        title="Issue Book"
        subtitle="Search a student, choose an available book, and confirm due dates"
        icon={<FaBook />}
      />

      <form onSubmit={handleSubmit} className="library-form-panel">
        <div className="library-section-card" style={{ marginBottom: 18 }}>
          <div className="library-section-header">
            <h2>
              <FaUser /> Student
            </h2>
          </div>
          <div className="library-section-body">
            <div className="library-field">
              <label className="erp-label">Find Student</label>
              <SearchField
                value={studentQ}
                onChange={(event) => {
                  setStudentQ(event.target.value);
                  setSelectedStudent(null);
                }}
                placeholder="Name or admission number, minimum 2 characters"
              />
              <p className="library-helper-text">Only enrolled students returned by library search can be selected.</p>
            </div>

            {sLoading && <div className="library-muted-text">Searching students...</div>}

            {!sLoading && students.length > 0 && !selectedStudent && (
              <div className="library-result-list">
                {students.map((student) => (
                  <button
                    type="button"
                    className="library-result-item"
                    key={student._id}
                    onClick={() => handleSelectStudent(student)}
                  >
                    <span>
                      <span className="library-primary-text">
                        {student.firstName} {student.lastName}
                      </span>
                      <span className="library-muted-text">
                        Adm: {student.admissionNumber} | {student.classId?.name} - {student.sectionId?.name}
                      </span>
                    </span>
                    {student.currentIssuedCount > 0 && (
                      <StatusBadge tone="warning">{student.currentIssuedCount} issued</StatusBadge>
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedStudent && (
              <div className="library-selected-card is-success">
                <div>
                  <div className="library-primary-text">
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </div>
                  <div className="library-muted-text">
                    {selectedStudent.classId?.name} - {selectedStudent.sectionId?.name} | {selectedStudent.admissionNumber}
                  </div>
                </div>
                <button
                  type="button"
                  className="library-icon-button"
                  onClick={() => {
                    setSelectedStudent(null);
                    setStudentQ('');
                  }}
                  aria-label="Clear selected student"
                >
                  <FaTimes />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="library-section-card" style={{ marginBottom: 18 }}>
          <div className="library-section-header">
            <h2>
              <FaBook /> Book
            </h2>
          </div>
          <div className="library-section-body">
            <div className="library-field">
              <label className="erp-label">Find Book</label>
              <SearchField
                value={bookQ}
                onChange={(event) => {
                  setBookQ(event.target.value);
                  setSelectedBook(null);
                }}
                placeholder="Title, author, or ISBN, minimum 2 characters"
              />
              <p className="library-helper-text">Books with zero available copies cannot be issued.</p>
            </div>

            {bLoading && <div className="library-muted-text">Searching books...</div>}

            {!bLoading && books.length > 0 && !selectedBook && (
              <div className="library-result-list">
                {books.map((book) => (
                  <button
                    type="button"
                    className="library-result-item"
                    key={book._id}
                    disabled={book.availableQuantity <= 0}
                    onClick={() => book.availableQuantity > 0 && handleSelectBook(book)}
                  >
                    <span>
                      <span className="library-primary-text">{book.title}</span>
                      <span className="library-muted-text">
                        {book.author} | {book.category}
                      </span>
                    </span>
                    <StatusBadge tone={book.availableQuantity > 0 ? 'success' : 'danger'}>
                      {book.availableQuantity}/{book.quantity} available
                    </StatusBadge>
                  </button>
                ))}
              </div>
            )}

            {selectedBook && (
              <div className="library-selected-card is-info">
                <div>
                  <div className="library-primary-text">{selectedBook.title}</div>
                  <div className="library-muted-text">
                    {selectedBook.author} | Available: {selectedBook.availableQuantity}
                  </div>
                </div>
                <button
                  type="button"
                  className="library-icon-button"
                  onClick={() => {
                    setSelectedBook(null);
                    setBookQ('');
                  }}
                  aria-label="Clear selected book"
                >
                  <FaTimes />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="library-section-card">
          <div className="library-section-header">
            <h2>Issue Details</h2>
          </div>
          <div className="library-section-body">
            <div className="library-form-grid">
              <div className="library-field">
                <label className="erp-label">Issue Date</label>
                <input
                  type="date"
                  className="erp-input"
                  value={issueDate}
                  onChange={(event) => setIssueDate(event.target.value)}
                />
              </div>
              <div className="library-field">
                <label className="erp-label">Due Date *</label>
                <input
                  type="date"
                  className="erp-input"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  required
                  min={issueDate}
                />
              </div>
              <div className="library-field library-field-span">
                <label className="erp-label">Remarks</label>
                <input
                  className="erp-input"
                  placeholder="Optional notes"
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="library-page-actions" style={{ marginTop: 18 }}>
          <button
            type="submit"
            className="erp-btn erp-btn-primary"
            disabled={issuing || !selectedStudent || !selectedBook}
          >
            {issuing ? 'Issuing...' : 'Issue Book'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default IssueBook;
