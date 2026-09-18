import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ConfirmModal from './ConfirmModal';
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
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setLogoutModalOpen(false);
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
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
                  onClick={() => setLogoutModalOpen(true)}
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

          {/* Mobile Navigation Controls */}
          <div style={{ display: 'none', alignItems: 'center', gap: '0.5rem' }} className="mobile-nav-toggle">
            <button
              onClick={toggleTheme}
              className="btn btn-secondary btn-sm"
              title="Toggle light/dark mode"
              style={{ padding: '0.45rem', borderRadius: 'var(--radius-full)', border: 'none', background: 'transparent' }}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        <div className={`mobile-nav-drawer ${mobileMenuOpen ? 'open' : ''}`}>
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem', padding: '0.35rem 0' }}
          >
            Explore Articles
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.95rem', padding: '0.35rem 0' }}
            >
              <ShieldCheck size={18} />
              Admin Panel
            </Link>
          )}

          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.25rem 0' }} />

          {isAuthenticated ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <Link
                to="/posts/new"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-primary btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <PenSquare size={16} />
                Write New Article
              </Link>

              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}
              >
                <UserIcon size={16} />
                <span>Signed in as @{user?.username}</span>
              </Link>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setLogoutModalOpen(true);
                }}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', color: 'var(--danger)' }}
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'center' }}
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-primary btn-sm"
                style={{ justifyContent: 'center' }}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={logoutModalOpen}
        title="Sign Out"
        message="Are you sure you want to sign out? You'll need to log in again to access your account."
        onConfirm={handleLogoutConfirm}
        onCancel={() => setLogoutModalOpen(false)}
        confirmText="Sign Out"
        isDanger
        isLoading={isLoggingOut}
      />
    </>
  );
};

export default Navbar;
