import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { PenSquare, Save, ArrowLeft, Globe, Tag } from 'lucide-react';

const CreateEditPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch initial post data if in edit mode
  useEffect(() => {
    if (!isEditing) return;

    const fetchPost = async () => {
      try {
        const res = await apiClient.get(`/posts/${id}`);
        const post = res.data.data;
        setTitle(post.title);
        setContent(post.content);
        setTagsInput((post.tags || []).join(', '));
      } catch (err) {
        setError('Failed to fetch post details for editing');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and Content are mandatory.');
      return;
    }

    setSaving(true);
    setError('');

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (isEditing) {
        const res = await apiClient.patch(`/posts/${id}`, {
          title: title.trim(),
          content: content.trim(),
          tags,
        });
        navigate(`/posts/${res.data.data.slug || id}`);
      } else {
        const res = await apiClient.post('/posts', {
          title: title.trim(),
          content: content.trim(),
          tags,
        });
        navigate(`/posts/${res.data.data.slug || res.data.data._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Error saving post');
    } finally {
      setSaving(false);
    }
  };

  const previewSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  if (loading) {
    return (
      <div className="container-narrow" style={{ paddingTop: '4rem' }}>
        <div className="skeleton" style={{ width: '40%', height: '2rem', marginBottom: '2rem' }}></div>
        <div className="skeleton" style={{ width: '100%', height: '3rem', marginBottom: '1.5rem' }}></div>
        <div className="skeleton" style={{ width: '100%', height: '14rem' }}></div>
      </div>
    );
  }

  return (
    <div className="container-narrow" style={{ paddingTop: '3rem' }}>
      <button
        onClick={() => navigate(-1)}
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: '1.5rem' }}
      >
        <ArrowLeft size={16} />
        Cancel & Return
      </button>

      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '2.75rem',
              height: '2.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <PenSquare size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem' }}>{isEditing ? 'Edit Blog Article' : 'Compose New Article'}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Publish high-impact technical writings with automatic URL slugging.
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '0.875rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              border: '1px solid rgba(239, 68, 68, 0.25)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Article Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Architecting Resilient Full-Stack Systems"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={200}
            />
          </div>

          {title && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginBottom: '1.25rem',
              }}
            >
              <Globe size={13} />
              <span>Slug preview: /posts/</span>
              <strong style={{ color: 'var(--accent-primary)' }}>{previewSlug || '...'}</strong>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Topics / Tags (comma-separated)</label>
            <input
              type="text"
              className="form-input"
              placeholder="react, nodejs, security, architecture"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Article Content</label>
            <textarea
              className="form-textarea"
              style={{ minHeight: '280px', fontFamily: 'inherit' }}
              placeholder="Write your article in depth..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              minLength={10}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={16} />
              {saving ? 'Saving...' : isEditing ? 'Update Article' : 'Publish Article'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEditPost;
