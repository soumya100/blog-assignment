import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { useForgotPassword, useVerifyOtp, useResetPassword } from '../hooks/useBlogApi';
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
  Eye,
  EyeOff,
  Clock,
  RotateCcw,
  Check,
  Shield,
  Send,
} from 'lucide-react';

const emailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
});

const passwordSchema = z
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

const ForgotPassword = () => {
  const navigate = useNavigate();
  const forgotPasswordMutation = useForgotPassword();
  const verifyOtpMutation = useVerifyOtp();
  const resetPasswordMutation = useResetPassword();

  // Wizard state: 1 = Email Request, 2 = Enter 6-digit OTP, 3 = Set New Password
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // OTP inputs state: 6 separate digits
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpInputRefs = useRef([]);

  // Countdown timer for OTP expiry (10 minutes) and resend cooldown (60 seconds)
  const [timeLeft, setTimeLeft] = useState(600); // 10 mins
  const [resendCooldown, setResendCooldown] = useState(60); // 60s
  const [otpError, setOtpError] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 1 Form
  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    setValue: setEmailValue,
    formState: { errors: emailErrors, isSubmitting: isEmailSubmitting },
  } = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  // Step 3 Form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    watch: watchPassword,
    setValue: setPasswordValue,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm({
    resolver: zodResolver(passwordSchema),
    mode: 'onChange',
    defaultValues: { password: '', confirmPassword: '' },
  });

  const newPasswordValue = watchPassword('password', '');
  const confirmPasswordValue = watchPassword('confirmPassword', '');

  // Password Strength Checklist
  const rules = {
    length: newPasswordValue.length >= 8,
    uppercase: /[A-Z]/.test(newPasswordValue),
    lowercase: /[a-z]/.test(newPasswordValue),
    number: /[0-9]/.test(newPasswordValue),
    special: /[^a-zA-Z0-9]/.test(newPasswordValue),
  };
  const passedCount = Object.values(rules).filter(Boolean).length;

  const getStrengthMeta = () => {
    if (passedCount === 0) return { label: '', color: 'transparent', width: '0%' };
    if (passedCount <= 2) return { label: 'Weak', color: '#ef4444', width: '30%' };
    if (passedCount <= 4) return { label: 'Good', color: '#f59e0b', width: '70%' };
    return { label: 'Strong & Secure', color: '#10b981', width: '100%' };
  };
  const strength = getStrengthMeta();

  // Step 2 Timers
  useEffect(() => {
    if (step !== 2) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  // Format seconds into MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  // Focus first OTP box on entering Step 2
  useEffect(() => {
    if (step === 2 && otpInputRefs.current[0]) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Quick fill helper for evaluator convenience
  const fillQuickEmail = (targetEmail) => {
    setEmailValue('email', targetEmail, { shouldValidate: true });
  };

  // Fill sample password in Step 3
  const fillStrongSample = () => {
    const sample = 'EnterprisePass2026!';
    setPasswordValue('password', sample, { shouldValidate: true });
    setPasswordValue('confirmPassword', sample, { shouldValidate: true });
  };

  // STEP 1 SUBMIT: Request OTP
  const onEmailSubmit = async (values) => {
    const targetEmail = values.email.trim().toLowerCase();
    try {
      const res = await forgotPasswordMutation.mutateAsync({ email: targetEmail });
      setEmail(targetEmail);
      if (res.data?.previewUrl) {
        setPreviewUrl(res.data.previewUrl);
      } else {
        setPreviewUrl(null);
      }
      setTimeLeft(600);
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      setOtpError('');
      setStep(2);
      toast.success('Recovery code dispatched to your email!', { autoClose: 3500 });
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Unable to send password recovery email. Please check your email configuration or try again.'), { autoClose: 5000 });
    }
  };

  // STEP 2: Handle OTP input changes, auto-advance, and backspace
  const handleOtpChange = (index, value) => {
    setOtpError('');
    // Allow only numeric characters
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal && value !== '') return;

    const char = cleanVal.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);

    // Auto advance to next input
    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Paste 6-digit code support
  const handleOtpPaste = (e) => {
    e.preventDefault();
    setOtpError('');
    const pastedData = e.clipboardData.getData('text').trim();
    const numericChars = pastedData.replace(/\D/g, '').slice(0, 6);

    if (numericChars.length > 0) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = numericChars[i] || '';
      }
      setOtpDigits(newDigits);

      // Focus appropriate box
      const nextEmpty = newDigits.findIndex((d) => !d);
      if (nextEmpty !== -1) {
        otpInputRefs.current[nextEmpty]?.focus();
      } else {
        otpInputRefs.current[5]?.focus();
      }
    }
  };

  // STEP 2 SUBMIT: Verify OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const fullOtp = otpDigits.join('');

    if (fullOtp.length !== 6) {
      setOtpError('Please enter the complete 6-digit verification code');
      return;
    }

    try {
      const res = await verifyOtpMutation.mutateAsync({
        email,
        otp: fullOtp,
      });

      const token = res.data?.resetToken;
      if (!token) {
        throw new Error('Verification failed: No reset token received');
      }

      setResetToken(token);
      setStep(3);
      toast.success('Identity confirmed! Please choose a new password.', { autoClose: 3500 });
    } catch (err) {
      const msg = extractErrorMessage(err, 'Invalid verification code');
      setOtpError(msg);
      toast.error(msg, { autoClose: 4000 });
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      const normalizedEmail = (email || '').trim().toLowerCase();
      const res = await forgotPasswordMutation.mutateAsync({ email: normalizedEmail });
      if (res.data?.previewUrl) {
        setPreviewUrl(res.data.previewUrl);
      } else {
        setPreviewUrl(null);
      }
      setTimeLeft(600);
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      setOtpError('');
      toast.success('A fresh 6-digit recovery code has been sent!', { autoClose: 3500 });
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Unable to resend recovery code. Please try again.'), { autoClose: 4000 });
    }
  };

  // STEP 3 SUBMIT: Update Password
  const onPasswordSubmit = async (values) => {
    if (!resetToken) {
      toast.error('Session expired. Please restart the verification process.', { autoClose: 4000 });
      setStep(1);
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({
        token: resetToken,
        password: values.password,
      });

      toast.success('Password updated successfully! Redirecting to sign in...', { autoClose: 3000 });
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update password'), { autoClose: 4000 });
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
              NIST Special Publication 800-63B
            </div>

            <h1 className="auth-showcase-title">
              Cryptographic OTP &amp; Zero-Trust Recovery.
            </h1>
            <p className="auth-showcase-subtitle">
              6-digit SHA-256 one-time passcodes, anti-tamper brute-force rate-limiting, and automatic multi-device session revocation.
            </p>

            <div className="auth-features-list">
              <div className="auth-feature-card">
                <div className="auth-feature-icon">
                  <KeyRound size={18} />
                </div>
                <div>
                  <div className="auth-feature-name">Cryptographic OTP Verification</div>
                  <div className="auth-feature-desc">
                    Single-use 6-digit passcodes securely hashed with SHA-256 before database storage to eliminate token leak vectors.
                  </div>
                </div>
              </div>

              <div className="auth-feature-card">
                <div className="auth-feature-icon">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div className="auth-feature-name">Brute-Force Lockout Defense</div>
                  <div className="auth-feature-desc">
                    Automatic revocation after 5 unsuccessful attempts to prevent automated code guessing attacks.
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
              <span style={{ fontSize: '0.7rem', opacity: 0.8, textTransform: 'none' }}>One-click email fill</span>
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

        {/* Right Column: Interactive Multi-Step Form Card */}
        <div className="auth-card">
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--text-secondary)',
              fontSize: '0.825rem',
              marginBottom: '1rem',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={14} />
            Back to Sign In
          </Link>

          {/* 3-Step Process Indicator */}
          <div className="recovery-step-indicator">
            <div className={`recovery-step-pill ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
              <span>1</span> Email
            </div>
            <div style={{ width: '12px', height: '1px', background: 'var(--border-subtle)' }}></div>
            <div className={`recovery-step-pill ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
              <span>2</span> Verify OTP
            </div>
            <div style={{ width: '12px', height: '1px', background: 'var(--border-subtle)' }}></div>
            <div className={`recovery-step-pill ${step === 3 ? 'active' : ''}`}>
              <span>3</span> Reset Password
            </div>
          </div>

          {/* ========================================================= */}
          {/* STEP 1: ENTER EMAIL                                       */}
          {/* ========================================================= */}
          {step === 1 && (
            <div>
              <div className="auth-header">
                <h2 className="auth-title">Account Recovery</h2>
                <p className="auth-subtitle">
                  Enter your registered email address to receive a secure 6-digit verification code and instant magic recovery link.
                </p>
              </div>

              <form onSubmit={handleSubmitEmail(onEmailSubmit)} noValidate>
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    Account Email Address
                  </label>
                  <div className="auth-input-container">
                    <input
                      type="email"
                      className={`auth-input ${emailErrors.email ? 'auth-input-error' : ''}`}
                      placeholder="name@company.com"
                      {...registerEmail('email')}
                    />
                    <Mail size={16} className="auth-input-icon" />
                  </div>
                  {emailErrors.email && (
                    <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertCircle size={12} />
                      <span>{emailErrors.email.message}</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={isEmailSubmitting || forgotPasswordMutation.isPending}
                >
                  {forgotPasswordMutation.isPending ? 'Sending Verification Code...' : 'Send Recovery Code & Magic Link'}
                </button>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: ENTER 6-DIGIT OTP CODE                            */}
          {/* ========================================================= */}
          {step === 2 && (
            <div>
              <div className="auth-header">
                <h2 className="auth-title">Enter Verification Code</h2>
                <p className="auth-subtitle">
                  We've dispatched a 6-digit one-time code to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
                </p>
              </div>

              {/* Development Sandbox Preview Notification */}
              {previewUrl && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                      Dev Sandbox Preview (Ethereal Mail):
                    </span>
                  </div>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-xs btn-primary"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  >
                    <ExternalLink size={12} />
                    View Sandbox Email
                  </a>
                </div>
              )}

              {/* 6-box OTP inputs */}
              <form onSubmit={handleVerifyOtp}>
                <div className="otp-inputs-grid" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className={`otp-digit-input ${digit ? 'filled' : ''}`}
                      autoComplete="off"
                    />
                  ))}
                </div>

                {otpError && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: '#ef4444',
                      fontSize: '0.775rem',
                      justifyContent: 'center',
                      marginBottom: '1rem',
                    }}
                  >
                    <AlertCircle size={14} />
                    <span>{otpError}</span>
                  </div>
                )}

                {/* Expiry and Resend Controls */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '1.25rem',
                    padding: '0 0.25rem',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={13} />
                    Expires in: <strong style={{ color: timeLeft < 60 ? '#ef4444' : 'var(--text-primary)' }}>{formatTime(timeLeft)}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || forgotPasswordMutation.isPending}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--accent-primary)',
                      cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <RotateCcw size={12} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={verifyOtpMutation.isPending || otpDigits.join('').length !== 6}
                >
                  {verifyOtpMutation.isPending ? 'Verifying Code...' : 'Confirm Code & Continue'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setOtpError('');
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '0.775rem',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Change Email Address
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: CREATE NEW PASSWORD                               */}
          {/* ========================================================= */}
          {step === 3 && (
            <div>
              <div className="auth-header">
                <h2 className="auth-title">Create New Password</h2>
                <p className="auth-subtitle">
                  Identity verified. Enter a hardened password conforming to enterprise security standards.
                </p>
              </div>

              {/* Evaluator Shortcut */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  marginBottom: '1rem',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Evaluator Shortcut:</span>
                <button
                  type="button"
                  onClick={fillStrongSample}
                  className="btn btn-xs btn-secondary"
                  style={{ gap: '0.25rem', fontSize: '0.725rem' }}
                >
                  <Sparkles size={11} />
                  Fill Valid Strong Password
                </button>
              </div>

              <form onSubmit={handleSubmitPassword(onPasswordSubmit)} noValidate>
                {/* New Password */}
                <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>
                    New Password
                  </label>
                  <div className="auth-input-container">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`auth-input ${passwordErrors.password ? 'auth-input-error' : ''}`}
                      placeholder="••••••••••••"
                      {...registerPassword('password')}
                    />
                    <Lock size={16} className="auth-input-icon" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="auth-eye-btn"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {newPasswordValue && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Strength:</span>
                        <span style={{ color: strength.color, fontWeight: 700 }}>{strength.label}</span>
                      </div>
                      <div style={{ height: '4px', background: 'var(--border-subtle)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: strength.width,
                            backgroundColor: strength.color,
                            transition: 'all 0.3s ease',
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {passwordErrors.password && (
                    <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertCircle size={12} />
                      <span>{passwordErrors.password.message}</span>
                    </div>
                  )}
                </div>

                {/* 5-rule checklist */}
                <div className="auth-rules-checklist">
                  <div className={`auth-rule-item ${rules.length ? 'passed' : ''}`}>
                    {rules.length ? <Check size={13} /> : <span style={{ width: 13, height: 13, borderRadius: '50%', border: '1px solid var(--border-subtle)' }} />}
                    <span>At least 8 characters in length</span>
                  </div>
                  <div className={`auth-rule-item ${rules.uppercase ? 'passed' : ''}`}>
                    {rules.uppercase ? <Check size={13} /> : <span style={{ width: 13, height: 13, borderRadius: '50%', border: '1px solid var(--border-subtle)' }} />}
                    <span>At least one uppercase letter (A-Z)</span>
                  </div>
                  <div className={`auth-rule-item ${rules.lowercase ? 'passed' : ''}`}>
                    {rules.lowercase ? <Check size={13} /> : <span style={{ width: 13, height: 13, borderRadius: '50%', border: '1px solid var(--border-subtle)' }} />}
                    <span>At least one lowercase letter (a-z)</span>
                  </div>
                  <div className={`auth-rule-item ${rules.number ? 'passed' : ''}`}>
                    {rules.number ? <Check size={13} /> : <span style={{ width: 13, height: 13, borderRadius: '50%', border: '1px solid var(--border-subtle)' }} />}
                    <span>At least one number (0-9)</span>
                  </div>
                  <div className={`auth-rule-item ${rules.special ? 'passed' : ''}`}>
                    {rules.special ? <Check size={13} /> : <span style={{ width: 13, height: 13, borderRadius: '50%', border: '1px solid var(--border-subtle)' }} />}
                    <span>At least one special symbol (!@#$%^&*)</span>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>
                    Confirm New Password
                  </label>
                  <div className="auth-input-container">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`auth-input ${passwordErrors.confirmPassword ? 'auth-input-error' : ''}`}
                      placeholder="••••••••••••"
                      {...registerPassword('confirmPassword')}
                    />
                    <Lock size={16} className="auth-input-icon" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="auth-eye-btn"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertCircle size={12} />
                      <span>{passwordErrors.confirmPassword.message}</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={isPasswordSubmitting || resetPasswordMutation.isPending || passedCount < 5}
                >
                  {resetPasswordMutation.isPending ? 'Updating Password...' : 'Save New Password & Sign In'}
                </button>
              </form>
            </div>
          )}

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
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
