import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PenSquare, Save, ArrowLeft, Globe, AlertCircle } from 'lucide-react';
import { usePost, useCreatePost, useUpdatePost } from '../hooks/useBlogApi';

const postSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  content: z.string().min(10, 'Article content must be at least 10 characters'),
  tagsInput: z.string().optional(),
});

const CreateEditPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  // TanStack Query for initial data if in edit mode
  const { data: existingPost, isLoading: postLoading } = usePost(isEditing ? id : null);

  // TanStack Query mutations with auto-dismissing toasts
  const createPostMutation = useCreatePost();
  const updatePostMutation = useUpdatePost();
  const isSaving = createPostMutation.isPending || updatePostMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      content: '',
      tagsInput: '',
    },
  });

  const title = watch('title', '');

  // Populate form in edit mode once loaded
  useEffect(() => {
    if (isEditing && existingPost) {
      reset({
        title: existingPost.title || '',
        content: existingPost.content || '',
        tagsInput: (existingPost.tags || []).join(', '),
      });
    }
  }, [isEditing, existingPost, reset]);

  const onSubmit = async (values) => {
    const tags = (values.tagsInput || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (isEditing) {
      const res = await updatePostMutation.mutateAsync({
        id,
        title: values.title.trim(),
        content: values.content.trim(),
        tags,
      });
      navigate(`/posts/${res.data?.slug || id}`);
    } else {
      const res = await createPostMutation.mutateAsync({
        title: values.title.trim(),
        content: values.content.trim(),
        tags,
      });
      navigate(`/posts/${res.data?.slug || res.data?._id}`);
    }
  };

  const previewSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  if (isEditing && postLoading) {
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

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Article Title</label>
            <input
              type="text"
              className={`form-input ${errors.title ? 'auth-input-error' : ''}`}
              placeholder="e.g. Architecting Resilient Full-Stack Systems"
              {...register('title')}
            />
            {errors.title && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <AlertCircle size={12} />
                <span>{errors.title.message}</span>
              </div>
            )}
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

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Topics / Tags (comma-separated)</label>
            <input
              type="text"
              className="form-input"
              placeholder="react, nodejs, security, architecture"
              {...register('tagsInput')}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Article Content</label>
            <textarea
              className={`form-textarea ${errors.content ? 'auth-input-error' : ''}`}
              style={{ minHeight: '280px', fontFamily: 'inherit' }}
              placeholder="Write your article in depth..."
              {...register('content')}
            />
            {errors.content && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <AlertCircle size={12} />
                <span>{errors.content.message}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              <Save size={16} />
              {isSaving ? 'Saving...' : isEditing ? 'Update Article' : 'Publish Article'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEditPost;
