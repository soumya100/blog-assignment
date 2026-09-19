import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import SEO from '../../components/SEO';

const AdminLayout = () => {
  const navItems = [
    { to: '/admin', end: true, label: 'Dashboard Overview', icon: LayoutDashboard },
    { to: '/admin/users', end: false, label: 'User Directory & RBAC', icon: Users },
    { to: '/admin/posts', end: false, label: 'Post Moderation', icon: FileText },
    { to: '/admin/comments', end: false, label: 'Comment Moderation', icon: MessageSquare },
    { to: '/admin/activity', end: false, label: 'System Audit Logs', icon: Activity },
  ];

  return (
    <div className="container" style={{ paddingTop: '2.5rem' }}>
      <SEO
        title="Admin Governance Console"
        description="Administrative management dashboard for DevLog: role-based access control, content moderation, and system audit logs."
      />
      {/* Top Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(59, 130, 246, 0.2)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldAlert size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.15rem' }}>System Administration</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Restricted Operations, Role-Based Access Control & Content Moderation
            </p>
          </div>
        </div>
      </div>

      {/* Grid Layout: Sidebar + Main Content */}
      <div className="admin-container">
        {/* Admin Navigation Sidebar */}
        <aside
          className="card admin-sidebar"
          style={{
            padding: '1rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0.5rem 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Control Modules
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    textDecoration: 'none',
                    backgroundColor: isActive ? 'var(--bg-elevated)' : 'transparent',
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                    transition: 'all 0.15s ease',
                  })}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Dynamic Nested Route Content */}
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
