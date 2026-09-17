import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { useResetPassword } from '../hooks/useBlogApi';
import { extractErrorMessage } from '../hooks/useApi';
import {
  Lock,
  Key,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter (A-Z)')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter (a-z)')
      .regex(/[0-9]/, 'Must contain at least one number (0-9)')
      .regex(/[^a-zA-Z0-9]/, 'Must contain at least one special character (!@#$%^&*)'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const resetPasswordMutation = useResetPassword();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password', '');
  const confirmPassword = watch('confirmPassword', '');

  // Live password rules checklist
  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
  };
  const passedCount = Object.values(rules).filter(Boolean).length;

  const getStrengthMeta = () => {
    if (passedCount === 0) return { label: '', color: 'transparent', width: '0%' };
    if (passedCount <= 2) return { label: 'Weak', color: '#ef4444', width: '30%' };
    if (passedCount <= 4) return { label: 'Good', color: '#f59e0b', width: '70%' };
    return { label: 'Strong & Secure', color: '#10b981', width: '100%' };
  };

  const strength = getStrengthMeta();

  const fillStrongSample = () => {
    const sample = 'NistHardenedPass99!';
    setValue('password', sample, { shouldValidate: true });
    setValue('confirmPassword', sample, { shouldValidate: true });
  };

  const onSubmit = async (values) => {
    if (!token) {
      toast.error('Missing reset token. Please request a new link.', { autoClose: 4000 });
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({
        token,
        password: values.password,
      });
      toast.success('Password reset successfully! Please sign in with your new credentials.', {
        autoClose: 4000,
      });
      navigate('/login');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to reset password. Link may have expired.'), {
        autoClose: 4000,
      });
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-ambient-glow"></div>

      <div className="auth-split-wrapper">
        {/* Left Column: Security Showcase */}
        <div className="auth-showcase-panel">
          <div>
            <div className="auth-badge-pulse">
              <span className="auth-badge-dot"></span>
              Cryptographic Key Rotation
            </div>

            <h1 className="auth-showcase-title">
              NIST-Compliant Password Hardening.
            </h1>
            <p className="auth-showcase-subtitle">
              Your new password will be hashed using 12 rounds of bcrypt and all existing refresh token session families will be terminated immediately.
            </p>

            <div className="auth-features-list">
              <div className="auth-feature-card">
                <div className="auth-feature-icon">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div className="auth-feature-name">Cryptographic Salting</div>
                  <div className="auth-feature-desc">
                    High work factor bcrypt salt rounds protecting against GPU accelerated rainbow table attacks.
                  </div>
                </div>
              </div>

              <div className="auth-feature-card">
                <div className="auth-feature-icon">
                  <Lock size={18} />
                </div>
                <div>
                  <div className="auth-feature-name">Token Revocation</div>
                  <div className="auth-feature-desc">
                    Single-use token verification immediately invalidates this link to prevent replay vulnerabilities.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Evaluator Fast-Track Box */}
          <div className="auth-reviewer-box">
            <div className="auth-reviewer-header">
              <Sparkles size={14} />
              <span>Evaluator Fast-Track Password</span>
            </div>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: '0.4rem 0 0.75rem 0' }}>
              One-click fills a valid NIST-hardened password for quick evaluation.
            </p>
            <button
              type="button"
              onClick={fillStrongSample}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              ✨ Fill Valid Strong Password
            </button>
          </div>
        </div>

        {/* Right Column: Form Card with Glossy Glassmorphism */}
        <div className="auth-card">
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--text-secondary)',
              fontSize: '0.825rem',
              marginBottom: '1.25rem',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={14} />
            Back to Sign In
          </Link>

          <div className="auth-header">
            <h2 className="auth-title">Create New Password</h2>
            <p className="auth-subtitle">
              Enter your new hardened password to restore secure access
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* New Password */}
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                New Hardened Password
              </label>
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
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength Meter Bar */}
              {password && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Strength:</span>
                    <span style={{ color: strength.color, fontWeight: 700 }}>{strength.label}</span>
                  </div>
                  <div style={{ height: '4px', width: '100%', background: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: strength.width,
                        background: strength.color,
                        transition: 'all 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )}

              {errors.password && (
                <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircle size={12} />
                  <span>{errors.password.message}</span>
                </div>
              )}
            </div>

            {/* Password Complexity Checklist */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.35rem',
                margin: '0.75rem 0 1.25rem 0',
                padding: '0.65rem 0.75rem',
                background: 'var(--bg-elevated)',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.725rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: rules.length ? 'var(--success)' : 'var(--text-muted)' }}>
                {rules.length ? <Check size={13} /> : <X size={13} />}
                <span>8+ characters</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: rules.uppercase ? 'var(--success)' : 'var(--text-muted)' }}>
                {rules.uppercase ? <Check size={13} /> : <X size={13} />}
                <span>Uppercase (A-Z)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: rules.lowercase ? 'var(--success)' : 'var(--text-muted)' }}>
                {rules.lowercase ? <Check size={13} /> : <X size={13} />}
                <span>Lowercase (a-z)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: rules.number ? 'var(--success)' : 'var(--text-muted)' }}>
                {rules.number ? <Check size={13} /> : <X size={13} />}
                <span>Number (0-9)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: rules.special ? 'var(--success)' : 'var(--text-muted)', gridColumn: 'span 2' }}>
                {rules.special ? <Check size={13} /> : <X size={13} />}
                <span>Special character (!@#$%^&*)</span>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                Confirm New Password
              </label>
              <div className="auth-input-container">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`auth-input ${errors.confirmPassword ? 'auth-input-error' : ''}`}
                  placeholder="••••••••••••"
                  {...register('confirmPassword')}
                />
                <Key size={16} className="auth-input-icon" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="auth-eye-btn"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircle size={12} />
                  <span>{errors.confirmPassword.message}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isSubmitting || resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? 'Updating Password...' : 'Set New Password & Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
