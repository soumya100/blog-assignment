import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ConfirmModal from './ConfirmModal';
import { toast } from 'react-toastify';
import apiClient from '../api/client';
import {
  AtSign, BarChart3, Bookmark, BookOpen, ChevronDown, Command,
  Compass, FileText, FolderOpen, Layers, LogOut, Mail, Menu, Moon,
  PenSquare, Search, ShieldCheck, Sun, Upload, User as UserIcon, X,
} from 'lucide-react';

const discoveryLinks = [
  { to: '/', label: 'Explore', icon: Compass },
  { to: '/community', label: 'Community', icon: BookOpen },
  { to: '/reader', label: 'Reader', icon: BookOpen, authenticated: true },
];

const creatorLinks = [
  { to: '/drafts', label: 'My drafts', description: 'Continue writing', icon: FileText },
  { to: '/library', label: 'Series & collections', description: 'Organize your content', icon: Layers },
  { to: '/newsletter', label: 'Newsletter', description: 'Manage your publication', icon: Mail },
  { to: '/analytics', label: 'Analytics', description: 'Understand your audience', icon: BarChart3 },
];

const libraryLinks = [
  { to: '/saved', label: 'Saved articles', description: 'Your reading list', icon: Bookmark },
  { to: '/mentions', label: 'Mentions', description: 'Where people mention you', icon: AtSign },
];

const accountLinks = [
  { to: '/import-export', label: 'Import / Export', description: 'Move your content and data', icon: Upload },
];

const searchItems = [
  ...discoveryLinks,
  ...creatorLinks,
  ...libraryLinks,
  ...accountLinks,
].map(({ to, label, icon }) => ({ to, label, icon }));

const MenuLink = ({ item, onSelect }) => {
  const Icon = item.icon;
  return (
    <Link to={item.to} role="menuitem" onClick={onSelect} className="nav-menu-item">
      <span className="nav-menu-icon"><Icon size={17} /></span>
      <span className="nav-menu-copy">
        <span className="nav-menu-label">{item.label}</span>
        {item.description && <span className="nav-menu-description">{item.description}</span>}
      </span>
    </Link>
  );
};

const Dropdown = ({ label, icon: Icon, align = 'left', children, className = '' }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) close();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  return (
    <div className={`nav-dropdown ${className}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="nav-dropdown-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {Icon && <Icon size={16} />}
        <span>{label}</span>
        <ChevronDown size={14} className={open ? 'is-open' : ''} />
      </button>
      {open && (
        <div className={`nav-dropdown-panel ${align === 'right' ? 'align-right' : ''}`} role="menu">
          {children(close)}
        </div>
      )}
    </div>
  );
};

const SearchPalette = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [articleResults, setArticleResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const results = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value ? searchItems.filter((item) => item.label.toLowerCase().includes(value)) : searchItems;
  }, [query]);

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setActiveIndex(0);
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
      }
      if (event.key === 'Enter' && results[activeIndex]) {
        event.preventDefault();
        navigate(results[activeIndex].to);
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, navigate, results, activeIndex]);

  useEffect(() => {
    const term = query.trim();
    if (!open || term.length < 2) { setArticleResults([]); setSearching(false); return undefined; }
    let active = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await apiClient.get('/posts', { params: { search: term, page: 1, limit: 5 } });
        if (active) setArticleResults(Array.isArray(response.data) ? response.data : []);
      } catch { if (active) setArticleResults([]); }
      finally { if (active) setSearching(false); }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [open, query]);

  if (!open) return null;
  return (
    <div className="nav-search-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="nav-search-dialog" role="dialog" aria-modal="true" aria-label="Search DevLog">
        <div className="nav-search-input-wrap">
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
            placeholder="Search or jump to..."
            aria-label="Search navigation"
            aria-controls="nav-search-results"
          />
          <kbd>ESC</kbd>
        </div>
        <div className="nav-search-results" id="nav-search-results">
          <p className="nav-menu-eyebrow">{query ? 'RESULTS' : 'QUICK NAVIGATION'}</p>
          {results.length ? results.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.to}
                className={`nav-search-result ${index === activeIndex ? 'active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => { navigate(item.to); onClose(); }}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {index === activeIndex && <kbd>↵</kbd>}
              </button>
            );
          }) : null}
          {query.trim().length >= 2 && <p className="nav-menu-eyebrow">ARTICLES</p>}
          {searching && <p className="nav-search-empty">Searching articles…</p>}
          {!searching && articleResults.map((post) => <button type="button" key={post._id} className="nav-search-result" onClick={() => { navigate('/posts/' + (post.slug || post._id)); onClose(); }}><FileText size={17} /><span>{post.title}</span></button>)}
          {!results.length && !articleResults.length && !searching && <p className="nav-search-empty">{query ? 'No matching pages or articles found.' : 'No matching destinations found.'}</p>}
        </div>
        <footer className="nav-search-footer">Navigate DevLog with your keyboard</footer>
      </section>
    </div>
  );
};

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const mobileTriggerRef = useRef(null);
  const mobilePanelRef = useRef(null);
  const desktopSearchTriggerRef = useRef(null);
  const mobileSearchTriggerRef = useRef(null);

  const closeMobile = useCallback(() => {
    setMobileMenuOpen(false);
    mobileTriggerRef.current?.focus();
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    const trigger = window.matchMedia('(min-width: 1101px)').matches
      ? desktopSearchTriggerRef.current
      : mobileSearchTriggerRef.current;
    trigger?.focus();
  }, []);

  useEffect(() => {
    const onShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', onShortcut);
    return () => document.removeEventListener('keydown', onShortcut);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const firstFocusable = mobilePanelRef.current?.querySelector('button, a');
    firstFocusable?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeMobile();
      if (event.key !== 'Tab') return;
      const focusable = [...(mobilePanelRef.current?.querySelectorAll('a[href], button:not([disabled])') || [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileMenuOpen, closeMobile]);

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setLogoutModalOpen(false);
      setMobileMenuOpen(false);
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Could not sign out. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayName = user?.username || user?.name || 'Profile';
  const visibleDiscoveryLinks = discoveryLinks.filter((item) => !item.authenticated || isAuthenticated);

  return (
    <>
      <header className="app-navbar">
        <div className="container navbar-inner">
          <Link to="/" className="navbar-brand" aria-label="DevLog home" onClick={() => setMobileMenuOpen(false)}>
            <span className="navbar-brand-mark"><Compass size={19} /></span>
            <span>DevLog</span>
            <span className="badge badge-primary navbar-version">v1.0</span>
          </Link>

          <nav className="desktop-nav" aria-label="Discovery navigation">
            {visibleDiscoveryLinks.map((item) => (
              <Link key={item.to} to={item.to} className="navbar-primary-link">{item.label}</Link>
            ))}
          </nav>

          <div className="navbar-search-area">
            <button ref={desktopSearchTriggerRef} type="button" className="navbar-search-trigger" onClick={() => setSearchOpen(true)} aria-label="Search or jump to, keyboard shortcut Control K">
              <Search size={15} />
              <span>Search or jump to...</span>
              <kbd><Command size={10} /> K</kbd>
            </button>
          </div>

          <div className="navbar-actions">
            {isAuthenticated && !loading ? (
              <>
                <Dropdown label="Creator Studio" icon={FolderOpen} className="creator-dropdown">
                  {(close) => (
                    <>
                      <p className="nav-menu-eyebrow">PUBLISHING WORKSPACE</p>
                      {creatorLinks.map((item) => <MenuLink key={item.to} item={item} onSelect={close} />)}
                    </>
                  )}
                </Dropdown>
                <Link to="/posts/new" className="btn btn-primary btn-sm navbar-write"><PenSquare size={16} /><span>Write</span></Link>
                <Dropdown label={displayName} icon={null} align="right" className="profile-dropdown">
                  {(close) => (
                    <>
                      <div className="nav-profile-heading">
                        <span className="nav-profile-avatar">
                          {user?.avatar ? <img src={user.avatar} alt="" /> : <UserIcon size={17} />}
                        </span>
                        <span className="nav-profile-copy">
                          <strong>{displayName}</strong>
                          <small>Personal workspace</small>
                        </span>
                      </div>
                      <p className="nav-menu-eyebrow">YOUR LIBRARY</p>
                      {libraryLinks.map((item) => <MenuLink key={item.to} item={item} onSelect={close} />)}
                      <p className="nav-menu-eyebrow nav-menu-eyebrow-spaced">ACCOUNT TOOLS</p>
                      {accountLinks.map((item) => <MenuLink key={item.to} item={item} onSelect={close} />)}
                      {isAdmin && <Link to="/admin" role="menuitem" onClick={close} className="nav-menu-item nav-admin-item"><span className="nav-menu-icon"><ShieldCheck size={17} /></span><span className="nav-menu-copy"><span className="nav-menu-label">Admin panel</span><span className="nav-menu-description">Platform administration</span></span></Link>}
                      <div className="nav-menu-divider" />
                      <button type="button" role="menuitem" className="nav-menu-action" onClick={() => { close(); toggleTheme(); }}>
                        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                        {theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                      </button>
                      <button type="button" role="menuitem" className="nav-menu-action nav-logout-action" onClick={() => { close(); setLogoutModalOpen(true); }}>
                        <LogOut size={17} /> Log out
                      </button>
                    </>
                  )}
                </Dropdown>
              </>
            ) : !loading && (
              <>
                <button type="button" onClick={toggleTheme} className="btn btn-secondary btn-sm navbar-icon-button" title="Toggle light/dark mode" aria-label="Toggle light/dark mode">
                  {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                </button>
                <Link to="/login" className="btn btn-secondary btn-sm">Log In</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
              </>
            )}
          </div>

          <div className="mobile-nav-toggle">
            <button ref={mobileSearchTriggerRef} type="button" onClick={() => setSearchOpen(true)} className="navbar-mobile-search" aria-label="Search DevLog"><Search size={18} /></button>
            <button ref={mobileTriggerRef} type="button" className="navbar-menu-toggle" onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation menu" aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation">
              <Menu size={21} />
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="nav-mobile-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeMobile();
        }}>
          <aside id="mobile-navigation" ref={mobilePanelRef} className="nav-mobile-panel" role="dialog" aria-modal="true" aria-label="Mobile navigation">
            <div className="nav-mobile-header">
              <Link to="/" className="navbar-brand" onClick={closeMobile}><span className="navbar-brand-mark"><Compass size={18} /></span><span>DevLog</span></Link>
              <button type="button" className="nav-mobile-close" onClick={closeMobile} aria-label="Close navigation"><X size={20} /></button>
            </div>
            <div className="nav-mobile-content">
              <p className="nav-menu-eyebrow">DISCOVER</p>
              {visibleDiscoveryLinks.map((item) => <Link key={item.to} to={item.to} className="nav-mobile-link" onClick={closeMobile}>{item.label}</Link>)}
              {isAuthenticated && (
                <>
                  <p className="nav-menu-eyebrow nav-mobile-section">CREATOR STUDIO</p>
                  {creatorLinks.map((item) => <MenuLink key={item.to} item={item} onSelect={closeMobile} />)}
                  <Link to="/posts/new" className="btn btn-primary nav-mobile-write" onClick={closeMobile}><PenSquare size={16} /> Write an article</Link>
                  <p className="nav-menu-eyebrow nav-mobile-section">YOUR LIBRARY</p>
                  {libraryLinks.map((item) => <MenuLink key={item.to} item={item} onSelect={closeMobile} />)}
                  <p className="nav-menu-eyebrow nav-mobile-section">ACCOUNT TOOLS</p>
                  {accountLinks.map((item) => <MenuLink key={item.to} item={item} onSelect={closeMobile} />)}
                  {isAdmin && <Link to="/admin" className="nav-mobile-link nav-admin-item" onClick={closeMobile}><ShieldCheck size={16} /> Admin panel</Link>}
                  <button type="button" className="nav-menu-action" onClick={toggleTheme}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}{theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}</button>
                  <button type="button" className="nav-menu-action nav-logout-action" onClick={() => { closeMobile(); setLogoutModalOpen(true); }}><LogOut size={17} /> Log out</button>
                </>
              )}
              {!isAuthenticated && !loading && <div className="nav-mobile-auth"><Link to="/login" className="btn btn-secondary" onClick={closeMobile}>Log In</Link><Link to="/register" className="btn btn-primary" onClick={closeMobile}>Sign Up</Link><button type="button" className="nav-menu-action" onClick={toggleTheme}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}{theme === 'dark' ? 'Light theme' : 'Dark theme'}</button></div>}
            </div>
          </aside>
        </div>
      )}

      <SearchPalette open={searchOpen} onClose={closeSearch} />
      <ConfirmModal isOpen={logoutModalOpen} title="Sign Out" message="Are you sure you want to sign out? You'll need to log in again to access your account." onConfirm={handleLogoutConfirm} onCancel={() => setLogoutModalOpen(false)} confirmText="Sign Out" isDanger isLoading={isLoggingOut} />
    </>
  );
};

export default Navbar;
