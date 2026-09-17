import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const socketServerUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketServerUrl, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      // connected
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
      newSocket.disconnect();
    };
  }, []);

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <SocketContext.Provider value={{ socket, notifications, dismissNotification }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
