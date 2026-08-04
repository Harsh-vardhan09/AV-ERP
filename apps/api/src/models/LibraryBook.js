/**
 * LibraryBook Model
 * ─────────────────
 * Multi-tenant book catalog. Every book is scoped to a school.
 * ISBN uniqueness is enforced per-school (not globally).
 * availableQuantity is managed atomically by the service layer (never updated directly).
 */
const mongoose = require('mongoose');

const libraryBookSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School ID is required'],
    index: true,
  },

  title: {
    type: String,
    required: [true, 'Book title is required'],
    trim: true,
  },

  author: {
    type: String,
    required: [true, 'Author name is required'],
    trim: true,
  },

  isbn: {
    type: String,
    trim: true,
    // Uniqueness enforced via compound index { isbn, schoolId } below
  },

  category: {
    type: String,
    trim: true,
    default: 'General',
  },

  rackNumber: {
    type: String,
    trim: true,
  },

  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 1,
  },

  availableQuantity: {
    type: Number,
    min: [0, 'Available quantity cannot be negative'],
    default: 1,
  },

  description: {
    type: String,
    trim: true,
  },

  // Cloudinary cover image (optional)
  coverImage: {
    url: { type: String, default: null },
    publicId: { type: String, default: null },
  },

  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true,
  },

  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  deletedAt: { type: Date, default: null },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────────────────────────
// ISBN unique within a school (allows same ISBN across different schools)
libraryBookSchema.index({ isbn: 1, schoolId: 1 }, { unique: true, sparse: true });

// Active books by school
libraryBookSchema.index({ schoolId: 1, status: 1 });

// Soft-delete filter
libraryBookSchema.index({ schoolId: 1, isDeleted: 1 });

// Combined status + soft-delete (most frequent query)
libraryBookSchema.index({ schoolId: 1, isDeleted: 1, status: 1 });

// Full-text search on title, author, isbn
libraryBookSchema.index({ title: 'text', author: 'text', isbn: 'text' });

// ── Virtual: isAvailable ──────────────────────────────────────────────────────
libraryBookSchema.virtual('isAvailable').get(function () {
  return this.availableQuantity > 0 && this.status === 'active' && !this.isDeleted;
});

module.exports = mongoose.model('LibraryBook', libraryBookSchema);
