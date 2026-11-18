import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ConfirmModal from './ConfirmModal';
import {
  PenSquare, ShieldCheck, Sun, Moon, LogOut, User as UserIcon,
  Menu, X, Compass, LayoutDashboard, ChevronDown,
} from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const closeMenus = () => {
    setMobileMenuOpen(false);
    setMoreMenuOpen(false);
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setLogoutModalOpen(false);
      closeMenus();
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const secondaryLinks = [
    { to: '/newsletter', label: 'Newsletter' },
    ...(isAuthenticated ? [
      { to: '/analytics', label: 'Analytics' },
      { to: '/library', label: 'Series & collections' },
      { to: '/mentions', label: 'Mentions' },
      { to: '/import-export', label: 'Import / Export' },
      { to: '/drafts', label: 'My drafts' },
      { to: '/saved', label: 'Saved articles' },
    ] : []),
    ...(isAdmin ? [{ to: '/admin', label: 'Admin panel', admin: true }] : []),
  ];

  return (
    <>
      <header className="app-navbar">
        <div className="container navbar-inner">
          <Link to="/" onClick={closeMenus} className="navbar-brand" aria-label="DevLog home">
            <span className="navbar-brand-mark"><Compass size={20} /></span>
            <span>DevLog</span>
            <span className="badge badge-primary navbar-version">v1.0</span>
          </Link>

          <nav className="desktop-nav" aria-label="Primary navigation">
            <Link to="/" className="navbar-primary-link">Explore</Link>
            <Link to="/community" className="navbar-primary-link">Community</Link>
            {isAuthenticated && <Link to="/reader" className="navbar-primary-link">Reader</Link>}
            <div className="navbar-more">
              <button type="button" className="navbar-more-trigger" aria-haspopup="menu" aria-expanded={moreMenuOpen} onClick={() => setMoreMenuOpen((open) => !open)}>
                More <ChevronDown size={15} />
              </button>
              {moreMenuOpen && (
                <div className="navbar-more-menu" role="menu">
                  {secondaryLinks.map((item) => (
                    <Link key={item.to} to={item.to} role="menuitem" onClick={closeMenus} className={item.admin ? 'navbar-menu-link navbar-menu-admin' : 'navbar-menu-link'}>
                      {item.admin && <ShieldCheck size={15} />}{item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="navbar-actions">
            <button type="button" onClick={toggleTheme} className="btn btn-secondary btn-sm navbar-icon-button" title="Toggle light/dark mode" aria-label="Toggle light/dark mode">
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            {isAuthenticated ? (
              <>
                <Link to="/posts/new" className="btn btn-primary btn-sm navbar-write"><PenSquare size={16} /><span>Write</span></Link>
                <Link to="/profile" className="btn btn-secondary btn-sm navbar-profile">
                  {user?.avatar ? <img src={user.avatar} alt="" className="navbar-avatar" /> : <UserIcon size={16} />}
                  <span>{user?.username || 'Profile'}</span>
                </Link>
                <button type="button" onClick={() => setLogoutModalOpen(true)} className="btn btn-secondary btn-sm navbar-icon-button" title="Log out" aria-label="Log out"><LogOut size={16} /></button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary btn-sm">Log In</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
              </>
            )}
          </div>

          <div className="mobile-nav-toggle">
            <button type="button" onClick={toggleTheme} className="btn btn-secondary btn-sm navbar-icon-button" title="Toggle light/dark mode" aria-label="Toggle light/dark mode">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button type="button" className="navbar-menu-toggle" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation">
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        <nav id="mobile-navigation" className={mobileMenuOpen ? 'mobile-nav-drawer open' : 'mobile-nav-drawer'} aria-label="Mobile navigation" aria-hidden={!mobileMenuOpen}>
          <Link to="/" onClick={closeMenus}>Explore articles</Link>
          <Link to="/community" onClick={closeMenus}>Community</Link>
          {isAuthenticated && <Link to="/reader" onClick={closeMenus}><LayoutDashboard size={17} /> Reader dashboard</Link>}
          {secondaryLinks.map((item) => (
            <Link key={item.to} to={item.to} onClick={closeMenus} className={item.admin ? 'navbar-menu-admin' : ''}>
              {item.admin && <ShieldCheck size={17} />}{item.label}
            </Link>
          ))}
          <div className="navbar-mobile-divider" />
          {isAuthenticated ? (
            <>
              <Link to="/posts/new" onClick={closeMenus} className="btn btn-primary btn-sm navbar-mobile-action"><PenSquare size={16} /> Write new article</Link>
              <Link to="/profile" onClick={closeMenus} className="btn btn-secondary btn-sm navbar-mobile-action">
                {user?.avatar ? <img src={user.avatar} alt="" className="navbar-avatar" /> : <UserIcon size={16} />}
                Signed in as @{user?.username || 'user'}
              </Link>
              <button type="button" onClick={() => { closeMenus(); setLogoutModalOpen(true); }} className="btn btn-secondary btn-sm navbar-mobile-action navbar-logout"><LogOut size={16} /> Log out</button>
            </>
          ) : (
            <div className="navbar-mobile-auth">
              <Link to="/login" onClick={closeMenus} className="btn btn-secondary btn-sm">Log In</Link>
              <Link to="/register" onClick={closeMenus} className="btn btn-primary btn-sm">Sign Up</Link>
            </div>
          )}
        </nav>
      </header>

      <ConfirmModal isOpen={logoutModalOpen} title="Sign Out" message="Are you sure you want to sign out? You'll need to log in again to access your account." onConfirm={handleLogoutConfirm} onCancel={() => setLogoutModalOpen(false)} confirmText="Sign Out" isDanger isLoading={isLoggingOut} />
    </>
  );
};

export default Navbar;
