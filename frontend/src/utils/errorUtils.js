/**
 * Extracts a user-friendly error message from RTK Query error objects.
 * Ensures no raw technical/Mongoose messages are shown to users.
 */
export const getErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  if (!err) return fallback;

  // RTK Query wraps backend errors in err.data
  const msg = err?.data?.message || err?.message || fallback;

  // If the backend already sent a friendly message (not a stack trace or Mongoose error), use it.
  // Filter out any remaining technical noise that slips through:
  const technicalPatterns = [
    /cast to objectid/i,
    /e11000 duplicate key/i,
    /validationerror/i,
    /mongo/i,
    /econnrefused/i,
    /cannot read prop/i,
    /typeerror/i,
    /syntaxerror/i,
  ];

  if (technicalPatterns.some(p => p.test(msg))) {
    return fallback;
  }

  return msg;
};

/**
 * Usage with react-hot-toast:
 *
 *   import { getErrorMessage } from '../../utils/errorUtils';
 *
 *   } catch (err) {
 *     toast.error(getErrorMessage(err));
 *   }
 */
