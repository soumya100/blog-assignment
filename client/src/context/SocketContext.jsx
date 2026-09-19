import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import queryClient from '../api/queryClient';
import { queryKeys } from '../hooks/useApi';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // Socket.io requires a persistent server — not available on Vercel serverless.
    // Skip connection entirely in production; REST API still works normally.
    if (import.meta.env.PROD) return;

    // Only connect to socket when user is authenticated
    if (!isAuthenticated) {
      // Cleanup any existing socket when user logs out
      if (socketRef.current) {
        socketRef.current.off('connect');
        socketRef.current.off('disconnect');
        socketRef.current.off('connect_error');
        socketRef.current.off('new_post');
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // If VITE_SOCKET_URL is set, use it; otherwise use same-origin (proxied via Vite ws proxy) or localhost:5000
    const socketServerUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (typeof window !== 'undefined' && window.location.port === '5173'
        ? window.location.origin
        : 'http://localhost:5000');

    // Use default reliable transport order (polling -> websocket upgrade)
    const newSocket = io(socketServerUrl, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', () => {
      // Handled cleanly; auto-reconnect handles recovery
    });

    // Listen to new blog post notifications
    newSocket.on('new_post', (data) => {
      const notification = {
        id: Date.now(),
        type: 'post',
        title: 'New Article Published!',
        message: `"${data.title}" by ${data.author}`,
        data,
      };
      setNotifications((prev) => [notification, ...prev.slice(0, 4)]);

      // Auto-dismissing real-time toast
      toast.info(
        <div>
          <div style={{ fontWeight: 600 }}>New Article Published!</div>
          <div style={{ fontSize: '0.85rem' }}>"{data.title}" by {data.author}</div>
          {data.slug && (
            <a
              href={`/posts/${data.slug}`}
              style={{ color: '#3b82f6', fontSize: '0.8rem', fontWeight: 600, display: 'inline-block', marginTop: '4px' }}
            >
              Read Article →
            </a>
          )}
        </div>,
        { autoClose: 5000 }
      );

      // Invalidate posts query cache so feeds update automatically
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
    });

    setSocket(newSocket);

    return () => {
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('connect_error');
      newSocket.off('new_post');
      newSocket.close();
      socketRef.current = null;
    };
  }, [isAuthenticated]);

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, notifications, dismissNotification }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
