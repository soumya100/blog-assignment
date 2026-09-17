import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  PenSquare,
  ShieldCheck,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Compass,
} from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'var(--bg-card)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '4.25rem',
        }}
      >
        {/* Brand Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            color: 'var(--text-primary)',
            fontWeight: 800,
            fontSize: '1.25rem',
            fontFamily: 'var(--font-display)',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '2.25rem',
              height: '2.25rem',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Compass size={20} />
          </div>
          <span>DevLog</span>
          <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
            v1.0
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
          }}
          className="desktop-nav"
        >
          <Link
            to="/"
            style={{
              color: 'var(--text-secondary)',
              fontWeight: 500,
              fontSize: '0.925rem',
            }}
          >
            Explore
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                color: 'var(--accent-primary)',
                fontWeight: 600,
                fontSize: '0.925rem',
              }}
            >
              <ShieldCheck size={18} />
              Admin Panel
            </Link>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="btn btn-secondary btn-sm"
            title="Toggle light/dark mode"
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-full)' }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link to="/posts/new" className="btn btn-primary btn-sm">
                <PenSquare size={16} />
                Write Post
              </Link>

              <Link
                to="/profile"
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <UserIcon size={16} />
                <span>{user?.username}</span>
              </Link>

              <button
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
                title="Log out"
                style={{ padding: '0.5rem' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link to="/login" className="btn btn-secondary btn-sm">
                Log In
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Sign Up
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
