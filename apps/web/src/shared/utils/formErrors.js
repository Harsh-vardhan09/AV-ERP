import toast from 'react-hot-toast';

/**
 * Show a toast error from an RTK Query error response.
 * Optionally sets Ant Design form field errors.
 */
export const applyServerErrors = (form, error) => {
  const message = error?.data?.message || error?.message || 'An unexpected error occurred';

  toast.error(message);

  if (form && error?.data?.errors) {
    const fields = Object.entries(error.data.errors).map(([name, messages]) => ({
      name,
      errors: Array.isArray(messages) ? messages : [messages],
    }));
    form.setFields(fields);
  }
};
