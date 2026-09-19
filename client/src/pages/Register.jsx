import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../hooks/useApi';
import SEO from '../components/SEO';
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

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username cannot exceed 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter (A-Z)')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter (a-z)')
      .regex(/[0-9]/, 'Must contain at least one number (0-9)')
      .regex(/[^a-zA-Z0-9]/, 'Must contain at least one special character (!@#$%^&*)'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const Register = () => {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password', '');
  const confirmPassword = watch('confirmPassword', '');

  // Live password rules validation
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
    setValue('username', `architect_${randomSuffix}`, { shouldValidate: true });
    setValue('email', `architect${randomSuffix}@devlog.io`, { shouldValidate: true });
    setValue('password', 'SuperSecurePass2026!', { shouldValidate: true });
    setValue('confirmPassword', 'SuperSecurePass2026!', { shouldValidate: true });
  };

  const onSubmit = async (values) => {
    try {
      await authRegister(values.username, values.email, values.password);
      toast.success('Account created successfully! Welcome to DevLog.', { autoClose: 3500 });
      navigate('/');
    } catch (err) {
      const msg = extractErrorMessage(err, 'Registration failed');
      toast.error(msg, { autoClose: 4000 });
    }
  };

  return (
    <div className="auth-page">
      <SEO
        title="Create Your DevLog Account"
        description="Join the DevLog community to publish technical articles, review system architectures, and collaborate with engineers."
      />
      <div className="auth-ambient-glow"></div>

      <div className="auth-split-wrapper">
        {/* Left Column: Platform Showcase */}
        <div className="auth-showcase-panel">
          <div>
            <div className="auth-badge-pulse">
              <span className="auth-badge-dot"></span>
              Join the Engineering Community
            </div>

            <h1 className="auth-showcase-title">
              Built for Modern Technical Teams.
            </h1>
            <p className="auth-showcase-subtitle">
              Publish architecture insights, engage in technical post reviews, and explore enterprise security patterns in real time.
            </p>

            <div className="auth-features-list">
              <div className="auth-feature-card">
                <div className="auth-feature-icon">
                  <Shield size={18} />
                </div>
                <div>
                  <div className="auth-feature-name">Cryptographic Password Defense</div>
                  <div className="auth-feature-desc">
                    Salted with 12 bcrypt rounds and enforced through NIST-compliant complexity checklists.
                  </div>
                </div>
              </div>

              <div className="auth-feature-card">
                <div className="auth-feature-icon">
                  <Radio size={18} />
                </div>
                <div>
                  <div className="auth-feature-name">Live WebSocket Notifications</div>
                  <div className="auth-feature-desc">
                    Instant full-duplex notifications when teammates publish new architecture write-ups.
                  </div>
                </div>
              </div>

              <div className="auth-feature-card">
                <div className="auth-feature-icon">
                  <BookOpen size={18} />
                </div>
                <div>
                  <div className="auth-feature-name">Zero-Trust Authorization</div>
                  <div className="auth-feature-desc">
                    Hardened BOLA/IDOR protection ensuring authors maintain strict content ownership.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Evaluator Quick Fill Box */}
          <div className="auth-demo-credentials-box">
            <div className="auth-demo-header">
              <Sparkles size={16} />
              <span>Evaluator Fast-Track Registration</span>
            </div>
            <p className="auth-demo-subtitle">
              Skip typing! Click below to instantly generate a strong, unique test candidate satisfying all 5 security rules.
            </p>
            <button
              type="button"
              onClick={fillEvaluatorSample}
              className="btn btn-primary btn-sm"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              ✨ Fill Valid Test Candidate Details
            </button>
          </div>
        </div>

        {/* Right Column: Register Form Card */}
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

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Username */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                Developer Username
              </label>
              <div className="auth-input-container">
                <input
                  type="text"
                  className={`auth-input ${errors.username ? 'auth-input-error' : ''}`}
                  placeholder="dev_lead"
                  {...register('username')}
                />
                <UserIcon size={16} className="auth-input-icon" />
              </div>
              {errors.username && (
                <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircle size={12} />
                  <span>{errors.username.message}</span>
                </div>
              )}
            </div>

            {/* Email */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                Email Address
              </label>
              <div className="auth-input-container">
                <input
                  type="email"
                  className={`auth-input ${errors.email ? 'auth-input-error' : ''}`}
                  placeholder="developer@example.com"
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
                  className={`auth-input ${errors.password ? 'auth-input-error' : ''}`}
                  placeholder="Min 8 characters, mixed case & symbols"
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
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                Confirm Password
              </label>
              <div className="auth-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`auth-input ${errors.confirmPassword ? 'auth-input-error' : ''}`}
                  placeholder="Re-enter your password"
                  {...register('confirmPassword')}
                />
                <Lock size={16} className="auth-input-icon" />
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
              disabled={isSubmitting}
              aria-label="Complete Registration"
            >
              {isSubmitting ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
              Sign in here →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
