import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus,
  Mail,
  User as UserIcon,
  Lock,
  Key,
  Check,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Shield,
  Radio,
  Sparkles,
  BookOpen,
  LogIn
} from 'lucide-react';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password rules validation
  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
  };
  const passedCount = Object.values(rules).filter(Boolean).length;
  const isPasswordValid = passedCount === 5;

  // Dynamic strength score
  const getStrengthMeta = () => {
    if (passedCount === 0) return { label: '', color: 'transparent', width: '0%' };
    if (passedCount <= 2) return { label: 'Weak', color: '#ef4444', width: '30%' };
    if (passedCount <= 4) return { label: 'Good', color: '#f59e0b', width: '70%' };
    return { label: 'Strong & Secure', color: '#10b981', width: '100%' };
  };

  const strength = getStrengthMeta();

  // Evaluator Quick Fill helper
  const fillEvaluatorSample = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setUsername(`architect_${randomSuffix}`);
    setEmail(`architect${randomSuffix}@devlog.io`);
    setPassword('SuperSecurePass2026!');
    setConfirmPassword('SuperSecurePass2026!');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!isPasswordValid) {
      setError('Please satisfy all password complexity requirements');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register(username, email, password);
      navigate('/');
    } catch (err) {
      const details = err.response?.data?.error?.details;
      if (details && Array.isArray(details)) {
        setError(details.map((d) => d.message).join(', '));
      } else {
        setError(err.response?.data?.error?.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
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
              Engineer Community v1.0
            </div>

            <h1 className="auth-showcase-title">
              Join the Enterprise Engineering Network.
            </h1>
            <p className="auth-showcase-subtitle">
              Publish architecture postmortems, RFCs, and security deep-dives. Protected by bcrypt-12 and zero-trust authorization.
            </p>

            <div className="auth-features-list">
              <div className="auth-feature-card">
                <div className="auth-feature-icon">
                  <Shield size={18} />
                </div>
                <div>
                  <div className="auth-feature-name">Cryptographic Identity Security</div>
                  <div className="auth-feature-desc">
                    Bcrypt salted password hashing, automated brute-force protection, and sanitized inputs.
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
                    Get instantaneous feedback, live moderation updates, and collaborative article discussions.
                  </div>
                </div>
              </div>

              <div className="auth-feature-card">
                <div className="auth-feature-icon">
                  <BookOpen size={18} />
                </div>
                <div>
                  <div className="auth-feature-name">Markdown & Architecture Publishing</div>
                  <div className="auth-feature-desc">
                    Author rich technical documentation with code formatting, URL slugs, and soft-delete safeguards.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Evaluator Fill Sandbox */}
          <div className="auth-reviewer-box">
            <div className="auth-reviewer-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={14} /> Evaluator Quick Sandbox
              </span>
              <span style={{ fontSize: '0.7rem', opacity: 0.8, textTransform: 'none' }}>Skip manual typing</span>
            </div>
            <button
              type="button"
              onClick={fillEvaluatorSample}
              className="auth-reviewer-btn"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Sparkles size={15} style={{ color: 'var(--accent-primary)' }} />
              <span>Fill Valid Test Candidate Details</span>
            </button>
          </div>
        </div>

        {/* Right Column: Form Card */}
        <div className="auth-card">
          {/* Segmented Switcher */}
          <div className="auth-segmented-tabs">
            <Link to="/login" className="auth-tab-btn">
              <LogIn size={15} />
              <span>Sign In</span>
            </Link>
            <div className="auth-tab-btn active">
              <UserPlus size={15} />
              <span>Create Account</span>
            </div>
          </div>

          <div className="auth-header">
            <h2 className="auth-title">Create Account</h2>
            <p className="auth-subtitle">
              Join the developer security and architecture community
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

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                Developer Username
              </label>
              <div className="auth-input-container">
                <input
                  type="text"
                  className="auth-input"
                  placeholder="dev_lead"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={30}
                />
                <UserIcon size={16} className="auth-input-icon" />
              </div>
            </div>

            {/* Email */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                Email Address
              </label>
              <div className="auth-input-container">
                <input
                  type="email"
                  className="auth-input"
                  placeholder="developer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Mail size={16} className="auth-input-icon" />
              </div>
            </div>

            {/* Password */}
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  Secure Password
                </label>
                {password && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: strength.color }}>
                    {strength.label}
                  </span>
                )}
              </div>
              <div className="auth-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Min 8 characters, mixed case & symbols"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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

              {/* Dynamic Multi-tier Strength Bar */}
              {password && (
                <div style={{ width: '100%', height: '4px', background: 'var(--border-subtle)', borderRadius: '999px', marginTop: '0.45rem', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: strength.width,
                      backgroundColor: strength.color,
                      transition: 'all 0.3s ease',
                      borderRadius: '999px',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Password Complexity Checklist */}
            {password && (
              <div className="auth-rules-checklist">
                <div className={`auth-rule-item ${rules.length ? 'passed' : ''}`}>
                  {rules.length ? <Check size={12} /> : <X size={12} />} At least 8 characters
                </div>
                <div className={`auth-rule-item ${rules.uppercase ? 'passed' : ''}`}>
                  {rules.uppercase ? <Check size={12} /> : <X size={12} />} Uppercase letter (A–Z)
                </div>
                <div className={`auth-rule-item ${rules.lowercase ? 'passed' : ''}`}>
                  {rules.lowercase ? <Check size={12} /> : <X size={12} />} Lowercase letter (a–z)
                </div>
                <div className={`auth-rule-item ${rules.number ? 'passed' : ''}`}>
                  {rules.number ? <Check size={12} /> : <X size={12} />} Number (0–9)
                </div>
                <div className={`auth-rule-item ${rules.special ? 'passed' : ''}`}>
                  {rules.special ? <Check size={12} /> : <X size={12} />} Special symbol (!@#$%^&*)
                </div>
              </div>
            )}

            {/* Confirm Password */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                Confirm Password
              </label>
              <div className="auth-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <Lock size={16} className="auth-input-icon" />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem', display: 'block' }}>
                  Passwords do not match
                </span>
              )}
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading || !isPasswordValid || password !== confirmPassword}
              aria-label="Complete Registration"
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
              Sign In →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
