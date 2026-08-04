import React from 'react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmLabel, variant }) => {
  if (!isOpen) return null;

  const isPrimary = variant === 'primary';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-[scaleIn_0.2s_ease-out]">
        {/* Icon — blue checkmark for primary, red warning for danger (default) */}
        <div className={`flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full ${isPrimary ? 'bg-indigo-100' : 'bg-red-100'}`}>
          {isPrimary ? (
            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )}
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">{title || 'Confirm Delete'}</h3>
        <p className="text-sm text-gray-600 text-center mb-6">{message || 'Are you sure you want to delete this? This action cannot be undone.'}</p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors ${
              isPrimary ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {confirmLabel || 'Delete'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ConfirmModal;
