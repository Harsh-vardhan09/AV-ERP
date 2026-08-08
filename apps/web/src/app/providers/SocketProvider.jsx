import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { incrementUnreadCount, setLatestNotification } from '@modules/notifications';

const SocketProvider = ({ children }) => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state?.user?.user);

  useEffect(() => {
    // Resolve user._id regardless of nesting depth
    const userId = currentUser?._id || currentUser?.user?._id;
    if (!userId) return;

    const socket = io(import.meta.env.VITE_PORT, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      // The server auto-joins the user's notification room from the JWT.
      // Emitting 'join:room' with a 'user:' prefix is blocked server-side.
    });

    socket.on('notification:new', (notif) => {
      dispatch(incrementUnreadCount());
      dispatch(setLatestNotification(notif));
      toast(notif.title, {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#fff',
          color: '#111827',
          border: '1px solid #E5E7EB',
          borderRadius: '10px',
          fontSize: '13px',
          maxWidth: '320px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        },
        icon: '🔔',
      });
    });

    return () => socket.disconnect();
  }, [currentUser?._id, currentUser?.user?._id, dispatch]);

  return children;
};

export default SocketProvider;
