import { isRejectedWithValue } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import { userlogout } from '@shared/lib/store/userSlice';

// A suspended school 403s every authenticated request. Without this each screen
// would surface it as its own generic error while the user stays "logged in".
const suspensionMiddleware = (store) => (next) => (action) => {
  if (isRejectedWithValue(action) && action.payload?.data?.code === 'SCHOOL_SUSPENDED') {
    const message = action.payload.data.message || 'This school has been suspended.';
    store.dispatch(userlogout());
    if (!window.location.pathname.startsWith('/login')) {
      toast.error(message);
      window.location.replace(`/login?suspended=${encodeURIComponent(message)}`);
    }
  }
  return next(action);
};

export default suspensionMiddleware;
