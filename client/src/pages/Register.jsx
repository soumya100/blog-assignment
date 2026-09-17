import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Mail, User as UserIcon, Lock, Check, X, AlertCircle } from 'lucide-react';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
  const isPasswordValid = Object.values(rules).every(Boolean);

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
    <div className="container-narrow" style={{ paddingTop: '3.5rem', maxWidth: '480px' }}>
      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '3.25rem',
              height: '3.25rem',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              marginBottom: '1rem',
            }}
          >
            <UserPlus size={24} />
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Create Your Account</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Join the developer security and architecture community.
          </p>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              padding: '0.875rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              border: '1px solid rgba(239, 68, 68, 0.25)',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <UserIcon
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="dev_lead"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={30}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Work or Personal Email</label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="developer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Secure Password</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Min 8 characters, mixed case & symbols"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password Complexity Checklist */}
          {password && (
            <div
              style={{
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem',
                marginBottom: '1rem',
                fontSize: '0.775rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: rules.length ? 'var(--success)' : 'var(--text-muted)' }}>
                {rules.length ? <Check size={13} /> : <X size={13} />} At least 8 characters
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: rules.uppercase ? 'var(--success)' : 'var(--text-muted)' }}>
                {rules.uppercase ? <Check size={13} /> : <X size={13} />} At least one uppercase letter (A-Z)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: rules.lowercase ? 'var(--success)' : 'var(--text-muted)' }}>
                {rules.lowercase ? <Check size={13} /> : <X size={13} />} At least one lowercase letter (a-z)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: rules.number ? 'var(--success)' : 'var(--text-muted)' }}>
                {rules.number ? <Check size={13} /> : <X size={13} />} At least one number (0-9)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: rules.special ? 'var(--success)' : 'var(--text-muted)' }}>
                {rules.special ? <Check size={13} /> : <X size={13} />} At least one special symbol (!@#$%^&*)
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={loading || !isPasswordValid || password !== confirmPassword}
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
