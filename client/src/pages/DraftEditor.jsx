import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Send, FileText } from 'lucide-react';
import { useCreateDraft, useDraft, usePublishDraft, useUpdateDraft } from '../hooks/useBlogApi';
import MarkdownEditor from '../components/MarkdownEditor';

const DraftEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const { data: draft, isLoading, isError } = useDraft(id, isEditing);
  const createDraft = useCreateDraft();
  const updateDraft = useUpdateDraft();
  const publishDraft = usePublishDraft();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [loaded, setLoaded] = useState(false);
  const busy = createDraft.isPending || updateDraft.isPending || publishDraft.isPending;

  useEffect(() => {
    if (draft && !loaded) {
      setTitle(draft.title || '');
      setContent(draft.content || '');
      setExcerpt(draft.excerpt || '');
      setCoverImage(draft.coverImage || '');
      setTagsInput((draft.tags || []).join(', '));
      setLoaded(true);
    }
  }, [draft, loaded]);

  const payload = () => ({
    title,
    content,
    excerpt,
    coverImage,
    tags: tagsInput.split(',').map((tag) => tag.trim()).filter(Boolean),
  });

  const save = async () => {
    if (isEditing) {
      const result = await updateDraft.mutateAsync({ id, ...payload() });
      return result.data;
    }
    const result = await createDraft.mutateAsync(payload());
    return result.data;
  };

  const handleSave = async () => {
    const saved = await save();
    if (!isEditing && saved?._id) navigate('/drafts/' + saved._id + '/edit', { replace: true });
  };

  const handlePublish = async () => {
    const saved = await save();
    const draftId = id || saved?._id;
    if (!draftId) return;
    const result = await publishDraft.mutateAsync(draftId);
    const post = result.data;
    navigate('/posts/' + (post?.slug || post?._id || ''));
  };

  if (isEditing && isLoading) return <main className="container-narrow" style={{ paddingTop: '4rem' }}><div className="skeleton" style={{ height: '18rem' }} /></main>;
  if (isEditing && (isError || !draft)) return <main className="container-narrow" style={{ paddingTop: '4rem' }}><p>Draft not found or you don't have permission to access it.</p><Link to="/drafts">Back to drafts</Link></main>;

  return (
    <main className="container-narrow publishing-page" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
      <Link to="/drafts" className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem' }}><ArrowLeft size={15} /> My drafts</Link>
      <section className="card publishing-card">
        <header className="publishing-heading">
          <div className="publishing-icon"><FileText size={20} /></div>
          <div><h1>{isEditing ? 'Continue your draft' : 'Start a draft'}</h1><p>Only you can see this article until you publish it.</p></div>
          <span className="autosave-indicator">Private draft</span>
        </header>
        <div className="form-group">
          <label className="form-label" htmlFor="draft-title">Article title</label>
          <input id="draft-title" className="form-input" maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give your article a working title" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="draft-excerpt">Excerpt (optional)</label>
          <textarea id="draft-excerpt" className="form-input" rows={2} maxLength={300} value={excerpt} onChange={(event) => setExcerpt(event.target.value)} placeholder="A short introduction for readers" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="draft-cover">Cover image URL (optional)</label>
          <input id="draft-cover" className="form-input" type="url" value={coverImage} onChange={(event) => setCoverImage(event.target.value)} placeholder="https://example.com/cover.jpg" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="draft-tags">Tags (comma separated)</label>
          <input id="draft-tags" className="form-input" value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} placeholder="react, engineering, tutorials" />
        </div>
        <div className="form-group">
          <label className="form-label">Article content</label>
          <MarkdownEditor value={content} onChange={setContent} />
        </div>
        <footer style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={handleSave} disabled={busy}><Save size={16} /> {busy ? 'Saving...' : 'Save draft'}</button>
          <button type="button" className="btn btn-primary" onClick={handlePublish} disabled={busy || title.trim().length < 3 || content.trim().length < 10}><Send size={16} /> {publishDraft.isPending ? 'Publishing...' : 'Publish article'}</button>
        </footer>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.75rem' }}>Publishing requires a title of at least 3 characters and content of at least 10 characters. Saving a draft has no minimum content requirement.</p>
      </section>
    </main>
  );
};

export default DraftEditor;
