import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Check, RotateCcw, Sparkles, User, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { PRESET_AVATARS, compressImageFile } from '../constants/avatars';
import { extractErrorMessage } from '../hooks/useApi';

export default function EditProfileModal({
  isOpen,
  onClose,
  currentUser,
  onSave,
  isLoading,
}) {
  if (!isOpen) return null;

  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [activeTab, setActiveTab] = useState('preset'); // 'preset' | 'upload'
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const errorTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  const showError = (message, durationMs = 4000) => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
    }
    setDialogError(message);
    errorTimerRef.current = setTimeout(() => {
      setDialogError('');
      errorTimerRef.current = null;
    }, durationMs);
  };

  const dismissError = () => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    setDialogError('');
  };

  // Lock body scroll, listen for Escape, and clean up timers on unmount
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }
    };
  }, [onClose]);

  const usernameInitial = currentUser?.username?.charAt(0).toUpperCase() || 'U';

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Please select a valid image file (PNG, JPG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('Image size must be less than 5MB');
      return;
    }

    dismissError();
    setIsProcessingFile(true);
    try {
      const compressedDataUrl = await compressImageFile(file, 256, 256, 0.88);
      setAvatar(compressedDataUrl);
      toast.info('Image loaded and optimized for avatar', { autoClose: 2000 });
    } catch (err) {
      showError('Failed to process uploaded image');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleResetToDefault = () => {
    setAvatar('');
    dismissError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    dismissError();

    if (bio.length > 250) {
      showError('Bio cannot exceed 250 characters');
      return;
    }

    try {
      await onSave({
        bio: bio.trim(),
        avatar: avatar.trim(),
      });
    } catch (err) {
      const errorMsg = extractErrorMessage(err, 'Failed to update profile. Please try again.');
      showError(errorMsg);
    }
  };

  // Determine current avatar type for badge
  const isDefaultAvatar = !avatar;
  const isCustomUploaded = avatar && avatar.startsWith('data:image');
  const isPresetAvatar = avatar && !avatar.startsWith('data:image');

  return createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '560px',
          width: '94%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.75rem 1rem 1.75rem',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.35rem', marginBottom: '0.2rem' }}>Edit Profile</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
              Personalize your public bio and community avatar
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: 'var(--radius-sm)',
            }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Scrollable Body Content */}
          <div
            style={{
              padding: '1.5rem 1.75rem',
              overflowY: 'auto',
              flex: 1,
            }}
          >
            {/* Avatar Preview & Actions Section */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              padding: '1.25rem',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '1.75rem',
            }}
          >
            {/* Live Avatar Preview Circle */}
            <div
              style={{
                width: '4.5rem',
                height: '4.5rem',
                minWidth: '4.5rem',
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(59, 130, 246, 0.3)',
                border: '2px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt={currentUser?.username || 'Profile'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '1.85rem', fontWeight: 700, color: '#ffffff' }}>
                  {usernameInitial}
                </span>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {currentUser?.username}
                </span>
                <span
                  className="badge"
                  style={{
                    fontSize: '0.7rem',
                    background: isDefaultAvatar
                      ? 'rgba(100, 116, 139, 0.2)'
                      : 'rgba(59, 130, 246, 0.2)',
                    color: isDefaultAvatar ? 'var(--text-muted)' : 'var(--accent-primary)',
                  }}
                >
                  {isDefaultAvatar ? 'Default Initial' : isCustomUploaded ? 'Custom Photo' : 'Preset Avatar'}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.785rem', marginBottom: '0.75rem' }}>
                Upload a custom photo or choose from illustrated preset avatars below.
              </p>

              {avatar && (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                >
                  <RotateCcw size={12} />
                  Reset to Default Initial
                </button>
              )}
            </div>
          </div>

          {/* Avatar Source Tabs */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '0.5rem',
                marginBottom: '1rem',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('preset')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'preset' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.85rem',
                  fontWeight: activeTab === 'preset' ? 600 : 500,
                  color: activeTab === 'preset' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Sparkles size={14} />
                Preset Avatars
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'upload' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.85rem',
                  fontWeight: activeTab === 'upload' ? 600 : 500,
                  color: activeTab === 'upload' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Upload size={14} />
                Upload Photo
              </button>
            </div>

            {/* Tab 1: Preset Avatars Grid */}
            {activeTab === 'preset' && (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
                    gap: '0.75rem',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    padding: '0.5rem',
                    background: 'var(--bg-main)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {PRESET_AVATARS.map((item) => {
                    const isSelected = avatar === item.url;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setAvatar(item.url)}
                        title={item.label}
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          padding: '2px',
                          border: isSelected ? '2px solid var(--accent-primary)' : '2px solid transparent',
                          background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-elevated)',
                          boxShadow: isSelected ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={item.url}
                          alt={item.label}
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                          loading="lazy"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: Upload Custom Photo */}
            {activeTab === 'upload' && (
              <div
                style={{
                  border: '2px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.75rem',
                  textAlign: 'center',
                  background: 'var(--bg-main)',
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  style={{ display: 'none' }}
                />
                <Upload size={28} style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }} />
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                  Choose a picture from your device
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.785rem', marginBottom: '1rem' }}>
                  PNG, JPG, or WebP up to 5MB (auto-optimized)
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingFile}
                  className="btn btn-secondary btn-sm"
                >
                  {isProcessingFile ? 'Optimizing Image...' : 'Browse Local Files'}
                </button>
              </div>
            )}
          </div>

          {/* Bio / Description Field */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.4rem',
              }}
            >
              <label htmlFor="user-bio" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Bio / About Yourself
              </label>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: bio.length > 230 ? 'var(--warning)' : 'var(--text-muted)',
                }}
              >
                {bio.length} / 250
              </span>
            </div>

            <textarea
              id="user-bio"
              className="form-input"
              rows={3}
              placeholder="e.g. Full-stack software engineer interested in distributed architectures and React performance."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              style={{
                width: '100%',
                lineHeight: 1.5,
                fontSize: '0.875rem',
                padding: '0.65rem 0.85rem',
              }}
            />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
              Your bio will appear on your public profile and below your published blog posts.
            </p>
          </div>
          </div>

          {/* In-Dialog Auto-Dismissing Bottom Toast */}
          {dialogError && (
            <div
              className="modal-bottom-toast"
              role="alert"
              style={{
                margin: '0.5rem 1.5rem 0.5rem 1.5rem',
              }}
            >
              <div className="modal-bottom-toast-content">
                <AlertCircle size={18} style={{ flexShrink: 0, color: '#ef4444' }} />
                <span style={{ fontWeight: 500, lineHeight: 1.4 }}>{dialogError}</span>
              </div>
              <button
                type="button"
                onClick={dismissError}
                className="modal-bottom-toast-close"
                title="Dismiss error"
              >
                <X size={15} />
              </button>
              <div
                className="modal-bottom-toast-progress"
                style={{ animationDuration: '4000ms' }}
              />
            </div>
          )}

          {/* Modal Footer Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              padding: '1rem 1.75rem 1.25rem 1.75rem',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isProcessingFile}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Check size={14} />
              {isLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
