import React from 'react';
import { Users, FileText, MessageSquare, ShieldCheck, Activity, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminStats } from '../../hooks/useBlogApi';

const AdminDashboard = () => {
  const { data: stats, isLoading: loading } = useAdminStats();

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          <div className="skeleton" style={{ height: '140px' }}></div>
          <div className="skeleton" style={{ height: '140px' }}></div>
          <div className="skeleton" style={{ height: '140px' }}></div>
        </div>
        <div className="skeleton" style={{ height: '300px' }}></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Platform Users',
      total: stats?.users?.total || 0,
      sub: `${stats?.users?.active || 0} Active · ${stats?.users?.deactivated || 0} Deactivated`,
      icon: Users,
      color: '#3b82f6',
      link: '/admin/users',
    },
    {
      title: 'Blog Articles',
      total: stats?.posts?.total || 0,
      sub: `${stats?.posts?.published || 0} Published · ${stats?.posts?.deleted || 0} Soft-Deleted`,
      icon: FileText,
      color: '#10b981',
      link: '/admin/posts',
    },
    {
      title: 'Community Comments',
      total: stats?.comments?.total || 0,
      sub: `${stats?.comments?.active || 0} Active · ${stats?.comments?.deleted || 0} Moderated`,
      icon: MessageSquare,
      color: '#8b5cf6',
      link: '/admin/comments',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 3 Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {card.title}
                  </span>
                  <div
                    style={{
                      fontSize: '2.25rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-display)',
                      marginTop: '0.25rem',
                    }}
                  >
                    {card.total}
                  </div>
                </div>

                <div
                  style={{
                    width: '2.75rem',
                    height: '2.75rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: `rgba(59, 130, 246, 0.12)`,
                    color: card.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={22} />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '0.75rem',
                  fontSize: '0.775rem',
                  color: 'var(--text-muted)',
                }}
              >
                <span>{card.sub}</span>
                <Link
                  to={card.link}
                  style={{ display: 'flex', alignItems: 'center', color: 'var(--accent-primary)', fontWeight: 600 }}
                >
                  Manage <ArrowUpRight size={13} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity Audit Logs */}
      <div className="card" style={{ padding: '1.75rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.15rem' }}>Live Security Audit Feed</h3>
          </div>
          <Link to="/admin/activity" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
            View Full Audit Trail →
          </Link>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Action Type</th>
                <th>Subject / User</th>
                <th>Resource</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {(!stats?.recentActivities || stats.recentActivities.length === 0) ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No recorded activities yet.
                  </td>
                </tr>
              ) : (
                stats.recentActivities.slice(0, 7).map((log) => (
                  <tr key={log._id}>
                    <td>
                      <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.user?.username || 'System / Unauth'}</td>
                    <td>{log.resourceType}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
