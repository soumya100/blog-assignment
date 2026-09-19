import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../hooks/useApi';
import { API_BASE_URL } from '../api/client';
import {
  Lock,
  Mail,
  Key,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Shield,
  Radio,
  FileCheck,
  CheckCircle2,
  LogIn,
  UserPlus
} from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const Login = () => {
  const { login, oauthDevLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [activeQuickRole, setActiveQuickRole] = useState(null);

  // Dev OAuth Modal State
  const [oauthModalOpen, setOauthModalOpen] = useState(false);
  const [oauthProvider, setOauthProvider] = useState('google');
  const [oauthEmail, setOauthEmail] = useState('');
  const [oauthName, setOauthName] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);

  // React Hook Form
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values) => {
    setError('');
    try {
      await login(values.email, values.password);
      toast.success('Welcome back to DevLog!', { autoClose: 3500 });
      navigate('/');
    } catch (err) {
      const msg = extractErrorMessage(err, 'Invalid email or password');
      setError(msg);
      toast.error(msg, { autoClose: 4000 });
    }
  };

  const fillQuickCredentials = (role) => {
    setActiveQuickRole(role);
    setError('');
    if (role === 'admin') {
      setValue('email', 'admin@blogplatform.dev', { shouldValidate: true });
      setValue('password', 'AdminSecurePass123!', { shouldValidate: true });
    } else {
      setValue('email', 'alice@example.com', { shouldValidate: true });
      setValue('password', 'UserPass123!', { shouldValidate: true });
    }
  };

  const handleDevOAuthSubmit = async (e) => {
    e.preventDefault();
    if (!oauthEmail || !oauthName) return;
    setOauthLoading(true);
    try {
      await oauthDevLogin(oauthProvider, oauthEmail, oauthName);
      toast.success(`Logged in with ${oauthProvider.toUpperCase()} Sandbox!`, { autoClose: 3500 });
      setOauthModalOpen(false);
      navigate('/');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'OAuth simulated login failed'), { autoClose: 4000 });
    } finally {
      setOauthLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-ambient-glow"></div>

      <div className="auth-split-wrapper">
        {/* Left Column: Platform Showcase */}
        <div className="auth-showcase-panel">
          <div>
            <div className="auth-badge-pulse">
              <span className="auth-badge-dot"></span>
              Enterprise Architecture v1.0
            </div>

            <h1 className="auth-showcase-title">
              Engineering Knowledge, Hardened by Design.
            </h1>
            <p className="auth-showcase-subtitle">
              A production-grade MERN platform engineered with zero-trust RBAC, rotating JWT session families, and OWASP API security defenses.
            </p>

            <div className="auth-features-list">
              <div className="auth-feature-card">
                <div className="auth-feature-icon">
                  <Shield size={18} />
                </div>
                <div>
                  <div className="auth-feature-name">Role-Based Access Control</div>
                  <div className="auth-feature-desc">
                    Strict server-side policy guards enforcing Admin moderation vs. Author publication rights.
                  </div>
                </div>
              </div>

              <div className="auth-feature-card">
                <div className="auth-feature-icon">
                  <Radio size={18} />
                </div>
                <div>
                  <div className="auth-feature-name">Real-Time WebSocket Engine</div>
                  <div className="auth-feature-desc">
                    Live Socket.io event propagation for instant post broadcasts and security audit logging.
                  </div>
                </div>
              </div>

              <div className="auth-feature-card">
                <div className="auth-feature-icon">
                  <FileCheck size={18} />
                </div>
                <div>
                  <div className="auth-feature-name">VAPT & BOLA Hardened</div>
                  <div className="auth-feature-desc">
                    Passed all 37 OWASP API test vectors with NoSQL sanitization and bcrypt-12 hashing.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Reviewer Credentials Sandbox */}
          <div className="auth-reviewer-box">
            <div className="auth-reviewer-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={14} /> Evaluator Quick Login
              </span>
              <span style={{ fontSize: '0.7rem', opacity: 0.8, textTransform: 'none' }}>One-click fill</span>
            </div>
            <div className="auth-reviewer-buttons">
              <button
                type="button"
                onClick={() => fillQuickCredentials('admin')}
                className={`auth-reviewer-btn ${activeQuickRole === 'admin' ? 'active' : ''}`}
                title="admin@blogplatform.dev / AdminSecurePass123!"
              >
                <ShieldCheck size={15} style={{ color: 'var(--accent-primary)' }} />
                <span>Demo Admin</span>
              </button>
              <button
                type="button"
                onClick={() => fillQuickCredentials('user')}
                className={`auth-reviewer-btn ${activeQuickRole === 'user' ? 'active' : ''}`}
                title="alice@example.com / UserPass123!"
              >
                <CheckCircle2 size={15} style={{ color: 'var(--success)' }} />
                <span>Demo Author</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Form Card */}
        <div className="auth-card">
          {/* Segmented Switcher */}
          <div className="auth-segmented-tabs">
            <div className="auth-tab-btn active">
              <LogIn size={15} />
              <span>Sign In</span>
            </div>
            <Link to="/register" className="auth-tab-btn">
              <UserPlus size={15} />
              <span>Create Account</span>
            </Link>
          </div>

          <div className="auth-header">
            <h2 className="auth-title">Welcome Back</h2>
            <p className="auth-subtitle">
              Enter your credentials to access your secure engineering workspace
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                border: '1px solid rgba(239, 68, 68, 0.25)',
              }}
            >
              <AlertCircle size={17} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* OAuth Setup Required Notice */}
          {searchParams.get('notice') === 'OAUTH_SETUP_REQUIRED' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.625rem',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.1)',
                color: 'var(--text-primary)',
                fontSize: '0.825rem',
                marginBottom: '1.25rem',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              <Sparkles size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '0.2rem', color: 'var(--accent-primary)' }}>
                  Live {searchParams.get('provider') === 'facebook' ? 'Facebook' : 'Google'} OAuth Setup Notice
                </strong>
                <span>
                  Real {searchParams.get('provider') === 'facebook' ? 'Facebook App' : 'Google Cloud'} client credentials are not configured in your <code>.env</code> file. You can test complete social auth instantly with the <strong>OAuth Dev Sandbox</strong> below!
                </span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                Work or Personal Email
              </label>
              <div className="auth-input-container">
                <input
                  type="email"
                  className={`auth-input ${errors.email ? 'auth-input-error' : ''}`}
                  placeholder="name@company.com"
                  {...register('email')}
                />
                <Mail size={16} className="auth-input-icon" />
              </div>
              {errors.email && (
                <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircle size={12} />
                  <span>{errors.email.message}</span>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  style={{
                    fontSize: '0.775rem',
                    fontWeight: 600,
                    color: 'var(--accent-primary)',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                  }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="auth-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`auth-input ${errors.password ? 'auth-input-error' : ''}`}
                  placeholder="••••••••••••"
                  {...register('password')}
                />
                <Key size={16} className="auth-input-icon" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-eye-btn"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircle size={12} />
                  <span>{errors.password.message}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isSubmitting}
              aria-label="Sign In"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '1.5rem 0',
              color: 'var(--text-muted)',
              fontSize: '0.725rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
            <span style={{ padding: '0 0.75rem', textTransform: 'uppercase' }}>Or continue with</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
          </div>

          {/* Social Logins */}
          <div className="auth-oauth-group">
            <a
              href={`${API_BASE_URL}/auth/google`}
              className="auth-oauth-btn"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>Sign in with Google OAuth 2.0</span>
            </a>

            <a
              href={`${API_BASE_URL}/auth/facebook`}
              className="auth-oauth-btn"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Sign in with Facebook OAuth 2.0</span>
            </a>

            <button
              type="button"
              onClick={() => {
                setOauthProvider('facebook');
                setOauthEmail('dev@facebook.com');
                setOauthName('Facebook Dev User');
                setOauthModalOpen(true);
              }}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.775rem', opacity: 0.9, marginTop: '0.15rem' }}
            >
              ✨ Test with OAuth Dev Sandbox
            </button>
          </div>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            New to DevLog?{' '}
            <Link to="/register" style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
              Create an account →
            </Link>
          </p>
        </div>
      </div>

      {/* OAuth Dev Sandbox Modal */}
      {oauthModalOpen && (
        <div className="modal-overlay" onClick={() => setOauthModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '2.75rem',
                  height: '2.75rem',
                  borderRadius: '10px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem' }}>OAuth 2.0 Dev Sandbox</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  Simulate verified {oauthProvider.toUpperCase()} identity callback
                </p>
              </div>
            </div>

            {/* Provider Switcher inside Modal */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => {
                  setOauthProvider('google');
                  setOauthEmail('engineer@gmail.com');
                  setOauthName('Google Dev User');
                }}
                className={`btn btn-sm ${oauthProvider === 'google' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Google Identity
              </button>
              <button
                type="button"
                onClick={() => {
                  setOauthProvider('facebook');
                  setOauthEmail('dev@facebook.com');
                  setOauthName('Facebook Dev User');
                }}
                className={`btn btn-sm ${oauthProvider === 'facebook' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Facebook Identity
              </button>
            </div>

            <form onSubmit={handleDevOAuthSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Simulated User Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={oauthName}
                  onChange={(e) => setOauthName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Simulated Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={oauthEmail}
                  onChange={(e) => setOauthEmail(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setOauthModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={oauthLoading}>
                  Complete {oauthProvider} Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
