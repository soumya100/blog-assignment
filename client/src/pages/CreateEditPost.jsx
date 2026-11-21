import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PenSquare, Save, ArrowLeft, Globe, AlertCircle, Image, FileText } from 'lucide-react';
import { usePost, useCreatePost, useUpdatePost } from '../hooks/useBlogApi';
import MarkdownEditor from '../components/MarkdownEditor';
import MarkdownContent from '../components/MarkdownContent';
import apiClient, { API_BASE_URL } from '../api/client';

const postSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters'),
  content: z.string().min(10, 'Article content must be at least 10 characters'),
  excerpt: z.string().max(300, 'Excerpt cannot exceed 300 characters').optional(),
  coverImage: z.string().url('Enter a valid image URL').or(z.literal('')).optional(),
  seoTitle: z.string().max(70, 'SEO title cannot exceed 70 characters').optional(),
  seoDescription: z.string().max(160, 'SEO description cannot exceed 160 characters').optional(),
  canonicalUrl: z.string().url('Enter a valid canonical URL').or(z.literal('')).optional(),
  noIndex: z.boolean().optional(),
  scheduledAt: z.string().optional(),
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
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [aiAction, setAiAction] = useState('improve');
  const [targetLanguage, setTargetLanguage] = useState('Spanish');
  const [aiOutput, setAiOutput] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(postSchema),
    defaultValues: { title: '', content: '', excerpt: '', coverImage: '', seoTitle: '', seoDescription: '', canonicalUrl: '', noIndex: false, scheduledAt: '', tagsInput: '' },
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
          reset({ title: draft.title || '', content: draft.content || '', excerpt: draft.excerpt || '', coverImage: draft.coverImage || '', seoTitle: draft.seoTitle || '', seoDescription: draft.seoDescription || '', canonicalUrl: draft.canonicalUrl || '', noIndex: Boolean(draft.noIndex), scheduledAt: draft.scheduledAt || '', tagsInput: draft.tagsInput || '' });
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
        seoTitle: existingPost.seoTitle || '',
        seoDescription: existingPost.seoDescription || '',
        canonicalUrl: existingPost.canonicalUrl || '',
        noIndex: Boolean(existingPost.noIndex),
        scheduledAt: existingPost.scheduledAt ? new Date(new Date(existingPost.scheduledAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
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
          seoTitle: watch('seoTitle') || '',
          seoDescription: watch('seoDescription') || '',
          canonicalUrl: watch('canonicalUrl') || '',
          noIndex: Boolean(watch('noIndex')),
          scheduledAt: watch('scheduledAt') || '',
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


  const uploadImage = async (file, cropToCover = false) => {
    if (!file) return '';
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      throw new Error('Choose a JPEG, PNG, WebP or GIF image.');
    }
    if (file.size > 5 * 1024 * 1024) throw new Error('Images must be 5 MB or smaller.');

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read the selected image.'));
      reader.readAsDataURL(file);
    });

    let uploadData = dataUrl;
    if (file.type !== 'image/gif' && typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file);
      const targetRatio = 16 / 9;
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = bitmap.width;
      let sourceHeight = bitmap.height;
      if (cropToCover && bitmap.width / bitmap.height > targetRatio) {
        sourceWidth = bitmap.height * targetRatio;
        sourceX = (bitmap.width - sourceWidth) / 2;
      } else if (cropToCover && bitmap.width / bitmap.height < targetRatio) {
        sourceHeight = bitmap.width / targetRatio;
        sourceY = (bitmap.height - sourceHeight) / 2;
      }
      const scale = Math.min(1, 1920 / sourceWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image editing is not supported in this browser.');
      context.drawImage(bitmap, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
      uploadData = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg', 0.88);
      bitmap.close?.();
    }

    const result = await apiClient.post('/uploads/image', { dataUrl: uploadData });
    const relativeUrl = result.data?.url;
    if (!relativeUrl) throw new Error('The server did not return an image URL.');
    const apiOrigin = new URL(API_BASE_URL, window.location.origin).origin;
    return new URL(relativeUrl, apiOrigin).toString();
  };

  const handleCoverUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const url = await uploadImage(file, true);
      setValue('coverImage', url, { shouldDirty: true, shouldValidate: true });
      setDraftMessage('Cover image uploaded');
    } catch (error) {
      setDraftMessage(error.message || 'Image upload failed');
    } finally {
      setIsUploadingImage(false);
    }
  };


  const runAiAssistant = async () => {
    if (content.trim().length < 10) { setDraftMessage('Write at least 10 characters before using AI assistance.'); return; }
    setAiBusy(true);
    setAiOutput('');
    try {
      const response = await apiClient.post('/ai/assist', { action: aiAction, content, targetLanguage });
      setAiOutput(response.data?.output || '');
    } catch (error) {
      setDraftMessage(error.message || 'AI assistance is unavailable. Check server provider configuration.');
    } finally { setAiBusy(false); }
  };

  const onSubmit = async (values) => {
    const tags = (values.tagsInput || '').split(',').map((tag) => tag.trim()).filter(Boolean);
    const payload = {
      title: values.title.trim(),
      content: content.trim(),
      excerpt: values.excerpt?.trim() || '',
      coverImage: values.coverImage?.trim() || '',
      seoTitle: values.seoTitle?.trim() || '',
      seoDescription: values.seoDescription?.trim() || '',
      canonicalUrl: values.canonicalUrl?.trim() || '',
      noIndex: Boolean(values.noIndex),
      scheduledAt: values.scheduledAt ? new Date(values.scheduledAt).toISOString() : null,
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
            <div className="cover-url-field"><Image size={16} /><input id="article-cover" type="url" className="form-input" placeholder="Paste an image URL or upload a file" {...register('coverImage')} /></div>
            <label className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', marginTop: '0.5rem', cursor: isUploadingImage ? 'wait' : 'pointer' }}>
              {isUploadingImage ? 'Uploading image…' : 'Upload image (max 5 MB)'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleCoverUpload} disabled={isUploadingImage} hidden />
            </label>
            {errors.coverImage && <p className="field-error">{errors.coverImage.message}</p>}
            {coverImage && !errors.coverImage && <img className="cover-image-preview" src={coverImage} alt="Article cover preview" onError={(event) => { event.currentTarget.style.display = 'none'; }} onLoad={(event) => { event.currentTarget.style.display = 'block'; }} />}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="article-tags">Topics / tags</label>
            <input id="article-tags" type="text" className="form-input" placeholder="react, nodejs, security, architecture" {...register('tagsInput')} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="article-scheduled-at">Publish date and time (optional)</label>
            <input id="article-scheduled-at" type="datetime-local" className="form-input" min={new Date(Date.now() + 60000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} {...register('scheduledAt')} />
            <span className="field-hint">Leave empty to publish immediately. Scheduled articles remain private until their publication time.</span>
          </div>

          <details className="form-group" style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 650 }}>Search engine settings (SEO)</summary>
            <p className="field-hint" style={{ margin: '0.5rem 0 1rem' }}>Optional metadata used by search engines and link previews. Leave blank to use the article title and excerpt.</p>
            <label className="form-label" htmlFor="article-seo-title">SEO title</label>
            <input id="article-seo-title" maxLength={70} className="form-input" placeholder="Search-friendly title (max 70 characters)" {...register('seoTitle')} />
            <span className="field-hint">{(watch('seoTitle') || '').length}/70</span>
            <label className="form-label" htmlFor="article-seo-description">SEO description</label>
            <textarea id="article-seo-description" rows={2} maxLength={160} className="form-textarea" placeholder="Concise search description (max 160 characters)" {...register('seoDescription')} />
            <span className="field-hint">{(watch('seoDescription') || '').length}/160</span>
            <label className="form-label" htmlFor="article-canonical-url">Canonical URL</label>
            <input id="article-canonical-url" type="url" className="form-input" placeholder="https://example.com/original-article" {...register('canonicalUrl')} />
            {errors.canonicalUrl && <p className="field-error">{errors.canonicalUrl.message}</p>}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
              <input type="checkbox" {...register('noIndex')} /> Prevent search engines from indexing this article
            </label>
          </details>

          <section className="card" style={{ padding: '1rem', marginBottom: '1rem' }} aria-label="AI writing assistant">
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end', flexWrap: 'wrap' }}>
              <label className="form-label">AI writing assistant
                <select className="form-input" value={aiAction} onChange={(event) => setAiAction(event.target.value)}>
                  <option value="improve">Improve writing</option><option value="summarize">Summarize</option><option value="outline">Create outline</option><option value="titles">Suggest titles</option><option value="translate">Translate</option>
                </select>
              </label>
              {aiAction === 'translate' && <label className="form-label">Target language<input className="form-input" value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)} maxLength={60} /></label>}
              <button type="button" className="btn btn-secondary btn-sm" onClick={runAiAssistant} disabled={aiBusy || !content.trim()}>{aiBusy ? 'Generating…' : 'Generate suggestion'}</button>
            </div>
            {aiOutput && <div style={{ marginTop: '1rem' }}>
              <textarea className="form-textarea" rows={6} value={aiOutput} readOnly aria-label="AI suggestion" />
              {(aiAction === 'improve' || aiAction === 'translate') && <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => { setContent(aiOutput); setAiOutput(''); }}>Replace article content with suggestion</button>}
              <button type="button" className="btn btn-secondary btn-sm" style={{ margin: '0.5rem' }} onClick={() => navigator.clipboard?.writeText(aiOutput)}>Copy suggestion</button>
            </div>}
          </section>

          <div className="form-group">
            <div className="editor-label-row"><label className="form-label">Article content</label><span className="field-hint">{wordCount} words · about {Math.max(1, Math.ceil(wordCount / 200))} min read</span></div>
            <MarkdownEditor value={content} onChange={setContent} error={errors.content} onImageUpload={uploadImage} />
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
