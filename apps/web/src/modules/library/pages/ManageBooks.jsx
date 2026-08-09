import React, { useEffect, useRef, useState } from 'react';
import { FaBook, FaEdit, FaImage, FaPlus, FaTimes, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import {
  useCreateBookMutation,
  useDeleteBookMutation,
  useGetBooksQuery,
  useUpdateBookMutation,
} from '../api/libraryApi';
import {
  FilterCard,
  ModalFrame,
  PageHeader,
  Pagination,
  SearchField,
  StatusBadge,
  TableShell,
} from '../components/LibraryUI';

const CATEGORIES = [
  'General',
  'Science',
  'Mathematics',
  'History',
  'Literature',
  'Geography',
  'Languages',
  'Arts',
  'Sports',
  'Reference',
  'Fiction',
  'Other',
];

const initForm = {
  title: '',
  author: '',
  isbn: '',
  category: 'General',
  rackNumber: '',
  quantity: 1,
  description: '',
  status: 'active',
};

const ManageBooks = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [form, setForm] = useState(initForm);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const debounceRef = useRef();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const { data, isLoading, isFetching } = useGetBooksQuery({
    search: debouncedSearch,
    category,
    status,
    page,
    limit: 15,
  });
  const [createBook, { isLoading: creating }] = useCreateBookMutation();
  const [updateBook, { isLoading: updating }] = useUpdateBookMutation();
  const [deleteBook, { isLoading: deleting }] = useDeleteBookMutation();

  const books = data?.books || [];
  const pagination = data?.pagination || {};

  const openCreate = () => {
    setEditBook(null);
    setForm(initForm);
    setCoverFile(null);
    setCoverPreview(null);
    setShowDrawer(true);
  };

  const openEdit = (book) => {
    setEditBook(book);
    setForm({
      title: book.title,
      author: book.author,
      isbn: book.isbn || '',
      category: book.category || 'General',
      rackNumber: book.rackNumber || '',
      quantity: book.quantity,
      description: book.description || '',
      status: book.status,
    });
    setCoverFile(null);
    setCoverPreview(book.coverImage?.url || null);
    setShowDrawer(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => fd.append(key, value));
      if (coverFile) fd.append('coverImage', coverFile);

      if (editBook) {
        await updateBook({ id: editBook._id, formData: fd }).unwrap();
        toast.success('Book updated');
      } else {
        await createBook(fd).unwrap();
        toast.success('Book added to library');
      }
      setShowDrawer(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save book');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteBook(deleteConfirm._id).unwrap();
      toast.success('Book removed');
      setDeleteConfirm(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setCategory('');
    setStatus('active');
    setPage(1);
  };

  return (
    <div className="library-page">
      <PageHeader
        title="Manage Books"
        subtitle={`${pagination.total ?? books.length} book record${(pagination.total ?? books.length) === 1 ? '' : 's'} found`}
        icon={<FaBook />}
        actions={
          <button className="erp-btn erp-btn-primary" onClick={openCreate}>
            <FaPlus size={12} /> Add Book
          </button>
        }
      />

      <FilterCard>
        <div className="library-filter-grid">
          <div className="library-field library-field-span">
            <label className="erp-label">Search</label>
            <SearchField
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="      Search title, author, or ISBN"
            />
          </div>
          <div className="library-field">
            <label className="erp-label">Category</label>
            <select
              className="erp-select"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
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
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="library-filter-actions">
            <button className="erp-btn" onClick={resetFilters}>
              Clear Filters
            </button>
          </div>
        </div>
      </FilterCard>

      <TableShell
        loading={isLoading || isFetching}
        empty={!books.length}
        emptyTitle="No books found"
        emptyDescription="Try a different search term or add a new book."
      >
        <table className="erp-table">
          <thead>
            <tr>
              {['Cover', 'Title / Author', 'ISBN', 'Category', 'Rack', 'Total', 'Available', 'Status', 'Actions'].map((heading) => (
                <th key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book._id}>
                <td>
                  {book.coverImage?.url ? (
                    <img className="library-cover-thumb" src={book.coverImage.url} alt={book.title} />
                  ) : (
                    <div className="library-cover-placeholder">
                      <FaImage />
                    </div>
                  )}
                </td>
                <td className="library-book-cell">
                  <div className="library-primary-text">{book.title}</div>
                  <div className="library-muted-text">{book.author}</div>
                </td>
                <td style={{ fontFamily: 'monospace' }}>{book.isbn || '-'}</td>
                <td>{book.category}</td>
                <td>{book.rackNumber || '-'}</td>
                <td style={{ fontWeight: 700 }}>{book.quantity}</td>
                <td style={{ fontWeight: 800, color: book.availableQuantity > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {book.availableQuantity}
                </td>
                <td>
                  <StatusBadge status={book.status} />
                </td>
                <td>
                  <div className="library-page-actions">
                    <button className="erp-btn erp-btn-sm" onClick={() => openEdit(book)} title="Edit book">
                      <FaEdit />
                    </button>
                    <button className="erp-btn erp-btn-sm erp-btn-danger" onClick={() => setDeleteConfirm(book)} title="Delete book">
                      <FaTrash />
                    </button>
                  </div>
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

      {showDrawer && (
        <div className="library-drawer-backdrop" onClick={() => setShowDrawer(false)}>
          <div className="library-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="library-drawer-header">
              <div>
                <h2>{editBook ? 'Edit Book' : 'Add New Book'}</h2>
                <p className="library-helper-text">Keep catalog details accurate for issuing and returns.</p>
              </div>
              <button className="library-icon-button" onClick={() => setShowDrawer(false)} aria-label="Close">
                <FaTimes />
              </button>
            </div>
            <div className="library-drawer-body">
              <form onSubmit={handleSubmit} className="library-form-grid">
                <div className="library-field library-field-span">
                  <label className="erp-label">Cover Image</label>
                  <div className="library-selected-card">
                    {coverPreview ? (
                      <img className="library-cover-thumb" src={coverPreview} alt="Book cover preview" />
                    ) : (
                      <div className="library-cover-placeholder">
                        <FaImage />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files[0];
                        if (file) {
                          setCoverFile(file);
                          setCoverPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </div>
                  <p className="library-helper-text">Optional image used only in the book catalog.</p>
                </div>

                {[
                  ['title', 'Title *', true],
                  ['author', 'Author *', true],
                  ['isbn', 'ISBN', false],
                  ['rackNumber', 'Rack / Shelf Number', false],
                ].map(([name, label, required]) => (
                  <div className="library-field" key={name}>
                    <label className="erp-label">{label}</label>
                    <input
                      className="erp-input"
                      required={required}
                      value={form[name]}
                      onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))}
                    />
                  </div>
                ))}

                <div className="library-field">
                  <label className="erp-label">Category</label>
                  <select
                    className="erp-select"
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  >
                    {CATEGORIES.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div className="library-field">
                  <label className="erp-label">Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    className="erp-input"
                    required
                    value={form.quantity}
                    onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                  />
                </div>

                <div className="library-field">
                  <label className="erp-label">Status</label>
                  <select
                    className="erp-select"
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="library-field library-field-span">
                  <label className="erp-label">Description</label>
                  <textarea
                    className="erp-input"
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  />
                </div>

                <div className="library-field-span library-page-actions">
                  <button type="submit" className="erp-btn erp-btn-primary" disabled={creating || updating}>
                    {creating || updating ? 'Saving...' : editBook ? 'Update Book' : 'Add Book'}
                  </button>
                  <button type="button" className="erp-btn" onClick={() => setShowDrawer(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <ModalFrame
          title="Remove Book?"
          tone="danger"
          onClose={() => setDeleteConfirm(null)}
          footer={
            <>
              <button className="erp-btn" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button className="erp-btn erp-btn-danger" disabled={deleting} onClick={handleDelete}>
                {deleting ? 'Removing...' : 'Yes, Remove'}
              </button>
            </>
          }
        >
          Remove <strong>{deleteConfirm.title}</strong> from the library catalog?
        </ModalFrame>
      )}
    </div>
  );
};

export default ManageBooks;
