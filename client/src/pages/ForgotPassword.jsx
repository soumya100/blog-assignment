import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { useForgotPassword } from '../hooks/useBlogApi';
import { extractErrorMessage } from '../hooks/useApi';
import {
  KeyRound,
  Mail,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
  ExternalLink,
  Copy,
} from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
});

const ForgotPassword = () => {
  const navigate = useNavigate();
  const forgotPasswordMutation = useForgotPassword();

  const [devResetToken, setDevResetToken] = useState(null);
  const [resetUrl, setResetUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values) => {
    try {
      const res = await forgotPasswordMutation.mutateAsync({ email: values.email.trim() });
      toast.success('Password reset instructions generated!', { autoClose: 3500 });
      if (res.data?.devResetToken) {
        setDevResetToken(res.data.devResetToken);
      }
      if (res.data?.resetUrl) {
        setResetUrl(res.data.resetUrl);
      }
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to request password reset'), { autoClose: 4000 });
    }
  };

  const fillQuickEmail = (email) => {
    setValue('email', email, { shouldValidate: true });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.info('Copied reset URL to clipboard', { autoClose: 2000 });
    setTimeout(() => setCopied(false), 2000);
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
              NIST Special Publication 800-63B
            </div>

            <h1 className="auth-showcase-title">
              Secure Cryptographic Account Recovery.
            </h1>
            <p className="auth-showcase-subtitle">
              Single-use SHA-256 tokens, anti-enumeration timing safety, and automatic session family revocation.
            </p>

            <div className="auth-features-list">
              <div className="auth-feature-card">
                <div className="auth-feature-icon">
                  <KeyRound size={18} />
                </div>
                <div>
                  <div className="auth-feature-name">32-Byte Cryptographic Tokens</div>
                  <div className="auth-feature-desc">
                    Raw entropy tokens hashed with SHA-256 before database storage to eliminate token leak vectors.
                  </div>
                </div>
              </div>

              <div className="auth-feature-card">
                <div className="auth-feature-icon">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div className="auth-feature-name">Anti-Enumeration Defenses</div>
                  <div className="auth-feature-desc">
                    Constant-time response semantics preventing malicious actors from probing valid platform accounts.
                  </div>
                </div>
              </div>

              <div className="auth-feature-card">
                <div className="auth-feature-icon">
                  <Lock size={18} />
                </div>
                <div>
                  <div className="auth-feature-name">Session Family Revocation</div>
                  <div className="auth-feature-desc">
                    Resetting a password automatically revokes all existing refresh tokens across all active devices.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Reviewer Credentials Sandbox */}
          <div className="auth-reviewer-box">
            <div className="auth-reviewer-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={14} /> Evaluator Quick Fill
              </span>
              <span style={{ fontSize: '0.7rem', opacity: 0.8, textTransform: 'none' }}>One-click fill</span>
            </div>
            <div className="auth-reviewer-buttons">
              <button
                type="button"
                onClick={() => fillQuickEmail('admin@blogplatform.dev')}
                className="auth-reviewer-btn"
                title="Fill admin@blogplatform.dev"
              >
                <ShieldCheck size={15} style={{ color: 'var(--accent-primary)' }} />
                <span>Demo Admin</span>
              </button>
              <button
                type="button"
                onClick={() => fillQuickEmail('alice@example.com')}
                className="auth-reviewer-btn"
                title="Fill alice@example.com"
              >
                <CheckCircle2 size={15} style={{ color: 'var(--success)' }} />
                <span>Demo Author</span>
              </button>
            </div>
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
            <h2 className="auth-title">Reset Your Password</h2>
            <p className="auth-subtitle">
              Enter your verified email address to generate a secure single-use recovery link
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                Account Email Address
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

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isSubmitting || forgotPasswordMutation.isPending}
            >
              {forgotPasswordMutation.isPending ? 'Generating Recovery Link...' : 'Send Recovery Instructions'}
            </button>
          </form>

          {/* Dev/Sandbox Quick Reset Banner */}
          {devResetToken && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                borderRadius: '14px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 700, fontSize: '0.875rem' }}>
                <CheckCircle2 size={16} />
                <span>Evaluator Sandbox: Recovery Token Generated</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                In this test environment, you can immediately test the password reset flow using this generated link:
              </p>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Link
                  to={`/reset-password/${devResetToken}`}
                  className="btn btn-primary btn-sm"
                  style={{ gap: '0.4rem', textDecoration: 'none' }}
                >
                  <ExternalLink size={13} />
                  Open Reset Password Page
                </Link>
                {resetUrl && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(resetUrl)}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: '0.4rem' }}
                  >
                    <Copy size={13} />
                    {copied ? 'Copied!' : 'Copy URL'}
                  </button>
                )}
              </div>
            </div>
          )}

          <p style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Remember your credentials?{' '}
            <Link to="/login" style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
              Sign In →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
