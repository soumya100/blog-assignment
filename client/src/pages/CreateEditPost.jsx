import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PenSquare, Save, ArrowLeft, Globe, AlertCircle, Image, FileText } from 'lucide-react';
import { usePost, useCreatePost, useUpdatePost } from '../hooks/useBlogApi';
import MarkdownEditor from '../components/MarkdownEditor';
import MarkdownContent from '../components/MarkdownContent';

const postSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters'),
  content: z.string().min(10, 'Article content must be at least 10 characters'),
  excerpt: z.string().max(300, 'Excerpt cannot exceed 300 characters').optional(),
  coverImage: z.string().url('Enter a valid image URL').or(z.literal('')).optional(),
  tagsInput: z.string().optional(),
});

const CreateEditPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const { data: existingPost, isLoading: postLoading } = usePost(isEditing ? id : null);
  const createPostMutation = useCreatePost();
  const updatePostMutation = useUpdatePost();
  const isSaving = createPostMutation.isPending || updatePostMutation.isPending;
  const [content, setContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(postSchema),
    defaultValues: { title: '', content: '', excerpt: '', coverImage: '', tagsInput: '' },
  });

  const title = watch('title', '');
  const coverImage = watch('coverImage', '');
  const wordCount = useMemo(() => content.trim() ? content.trim().split(/\s+/).length : 0, [content]);

  useEffect(() => {
    if (!isEditing) {
      try {
        const saved = window.localStorage.getItem('blog-editor-draft:new');
        if (saved) {
          const draft = JSON.parse(saved);
          reset({ title: draft.title || '', content: draft.content || '', excerpt: draft.excerpt || '', coverImage: draft.coverImage || '', tagsInput: draft.tagsInput || '' });
          setContent(draft.content || '');
          setDraftMessage('Recovered local draft');
        }
      } catch {
        setDraftMessage('Could not recover previous local draft');
      }
    }
  }, [isEditing, reset]);

  useEffect(() => {
    if (isEditing && existingPost) {
      setContent(existingPost.content || '');
      reset({
        title: existingPost.title || '',
        content: existingPost.content || '',
        excerpt: existingPost.excerpt || '',
        coverImage: existingPost.coverImage || '',
        tagsInput: (existingPost.tags || []).join(', '),
      });
    }
  }, [isEditing, existingPost, reset]);

  useEffect(() => {
    setValue('content', content, { shouldValidate: Boolean(content) });
  }, [content, setValue]);

  useEffect(() => {
    if (!content || isEditing && !existingPost) return undefined;
    const timeout = window.setTimeout(() => {
      try {
        const key = `blog-editor-draft:${id || 'new'}`;
        window.localStorage.setItem(key, JSON.stringify({
          title: title || '',
          content,
          excerpt: watch('excerpt') || '',
          coverImage: watch('coverImage') || '',
          tagsInput: watch('tagsInput') || '',
          savedAt: new Date().toISOString(),
        }));
        setDraftMessage('Saved locally');
      } catch {
        setDraftMessage('Local autosave unavailable');
      }
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [content, title, id, isEditing, existingPost, watch]);

  const onSubmit = async (values) => {
    const tags = (values.tagsInput || '').split(',').map((tag) => tag.trim()).filter(Boolean);
    const payload = {
      title: values.title.trim(),
      content: content.trim(),
      excerpt: values.excerpt?.trim() || '',
      coverImage: values.coverImage?.trim() || '',
      tags,
    };

    if (isEditing) {
      const res = await updatePostMutation.mutateAsync({ id, ...payload });
      window.localStorage.removeItem(`blog-editor-draft:${id}`);
      navigate(`/posts/${res.data?.slug || id}`);
    } else {
      const res = await createPostMutation.mutateAsync(payload);
      window.localStorage.removeItem('blog-editor-draft:new');
      navigate(`/posts/${res.data?.slug || res.data?._id}`);
    }
  };

  const previewSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  if (isEditing && postLoading) {
    return <div className="container-narrow" style={{ paddingTop: '4rem' }}><div className="skeleton" style={{ width: '40%', height: '2rem', marginBottom: '2rem' }} /><div className="skeleton" style={{ width: '100%', height: '14rem' }} /></div>;
  }

  return (
    <div className="container-narrow publishing-page" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
      <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Cancel & Return
      </button>

      <div className="card publishing-card">
        <div className="publishing-heading">
          <div className="publishing-icon"><PenSquare size={20} /></div>
          <div>
            <h2>{isEditing ? 'Edit your article' : 'Create an article'}</h2>
            <p>Write in Markdown, preview your work, and prepare it for readers.</p>
          </div>
          <span className="autosave-indicator">{draftMessage || 'Autosave enabled'}</span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="article-title">Article title</label>
            <input id="article-title" type="text" className={`form-input ${errors.title ? 'auth-input-error' : ''}`} placeholder="A title readers will remember" {...register('title')} />
            {errors.title && <p className="field-error"><AlertCircle size={12} />{errors.title.message}</p>}
          </div>

          {title && <div className="slug-preview"><Globe size={13} /> /posts/<strong>{previewSlug || 'your-article'}</strong></div>}

          <div className="form-group">
            <label className="form-label" htmlFor="article-excerpt">Short description</label>
            <textarea id="article-excerpt" rows={2} maxLength={300} className="form-textarea" placeholder="A concise summary shown in article cards and search previews" {...register('excerpt')} />
            <span className="field-hint">{(watch('excerpt') || '').length}/300 characters</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="article-cover">Cover image URL</label>
            <div className="cover-url-field"><Image size={16} /><input id="article-cover" type="url" className="form-input" placeholder="https://example.com/cover.jpg" {...register('coverImage')} /></div>
            {errors.coverImage && <p className="field-error">{errors.coverImage.message}</p>}
            {coverImage && !errors.coverImage && <img className="cover-image-preview" src={coverImage} alt="Article cover preview" onError={(event) => { event.currentTarget.style.display = 'none'; }} onLoad={(event) => { event.currentTarget.style.display = 'block'; }} />}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="article-tags">Topics / tags</label>
            <input id="article-tags" type="text" className="form-input" placeholder="react, nodejs, security, architecture" {...register('tagsInput')} />
          </div>

          <div className="form-group">
            <div className="editor-label-row"><label className="form-label">Article content</label><span className="field-hint">{wordCount} words · about {Math.max(1, Math.ceil(wordCount / 200))} min read</span></div>
            <MarkdownEditor value={content} onChange={setContent} error={errors.content} />
            {errors.content && <p className="field-error"><AlertCircle size={12} />{errors.content.message}</p>}
          </div>

          <div className="publishing-preview-toggle">
            <button type="button" className={showPreview ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'} onClick={() => setShowPreview((value) => !value)}>
              <FileText size={15} /> {showPreview ? 'Hide full preview' : 'Preview article'}
            </button>
          </div>
          {showPreview && <div className="article-live-preview">
            <span className="preview-eyebrow">ARTICLE PREVIEW</span>
            {coverImage && <img src={coverImage} alt="" />}
            <h1>{title || 'Your article title'}</h1>
            {watch('excerpt') && <p className="preview-excerpt">{watch('excerpt')}</p>}
            <MarkdownContent content={content} />
          </div>}

          <div className="publishing-actions">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary" disabled={isSaving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving || !content.trim()}>
              <Save size={16} />{isSaving ? 'Saving...' : isEditing ? 'Update article' : 'Publish article'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEditPost;
