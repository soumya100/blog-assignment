import React from 'react';
import { useSocket } from '../context/SocketContext';
import { Bell, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const NotificationToast = () => {
  const { notifications, dismissNotification } = useSocket();

  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="toast-container">
      {notifications.map((n) => (
        <div key={n.id} className="toast">
          <div
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(59, 130, 246, 0.2)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bell size={16} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{n.title}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{n.message}</div>
            {n.data?.slug && (
              <Link
                to={`/posts/${n.data.slug}`}
                onClick={() => dismissNotification(n.id)}
                style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '0.25rem', display: 'inline-block' }}
              >
                Read Article →
              </Link>
            )}
          </div>

          <button
            onClick={() => dismissNotification(n.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
            }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
