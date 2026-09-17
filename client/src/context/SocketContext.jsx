import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
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
  }, []);

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
