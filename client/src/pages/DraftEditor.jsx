import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Send, FileText } from 'lucide-react';
import { useCreateDraft, useDraft, usePublishDraft, useUpdateDraft } from '../hooks/useBlogApi';
import MarkdownEditor from '../components/MarkdownEditor';
import { useSocket } from '../context/SocketContext';
import apiClient from '../api/client';
import { toast } from 'react-toastify';

const DraftEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
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
  const autosaveTimer = useRef(null);
  const lastSaved = useRef('');
  const applyingRemoteChange = useRef(false);
  const [collaboratorUsername, setCollaboratorUsername] = useState('');
  const [collaborationStatus, setCollaborationStatus] = useState('');
  const [autosaveStatus, setAutosaveStatus] = useState('Private draft');

  useEffect(() => {
    if (draft && !loaded) {
      setTitle(draft.title || '');
      setContent(draft.content || '');
      setExcerpt(draft.excerpt || '');
      setCoverImage(draft.coverImage || '');
      setTagsInput((draft.tags || []).join(', '));
      lastSaved.current = JSON.stringify({ title: draft.title || '', content: draft.content || '', excerpt: draft.excerpt || '', coverImage: draft.coverImage || '', tags: draft.tags || [] });
      setLoaded(true);
    }
  }, [draft, loaded]);


  useEffect(() => {
    if (!id || !socket || !isConnected) return undefined;
    socket.emit('join_draft', id, (result) => {
      setCollaborationStatus(result?.ok ? 'Live collaboration connected' : (result?.message || 'Collaboration unavailable'));
    });
    const handleRemoteChange = (update) => {
      if (update?.draftId !== id || typeof update.content !== 'string') return;
      applyingRemoteChange.current = true;
      setContent(update.content);
      setCollaborationStatus('A collaborator is editing this draft');
    };
    socket.on('draft_remote_change', handleRemoteChange);
    return () => {
      socket.emit('leave_draft', id);
      socket.off('draft_remote_change', handleRemoteChange);
    };
  }, [id, socket, isConnected]);

  useEffect(() => {
    if (!id || !socket || !loaded || !isConnected) return;
    if (applyingRemoteChange.current) {
      applyingRemoteChange.current = false;
      return;
    }
    socket.emit('draft_change', { draftId: id, content });
  }, [id, socket, loaded, isConnected, content]);

  const inviteCollaborator = async () => {
    if (!id || !collaboratorUsername.trim()) return;
    try {
      await apiClient.post('/drafts/' + id + '/collaborators', { username: collaboratorUsername.trim() });
      setCollaboratorUsername('');
      toast.success('Collaborator added');
    } catch (error) { toast.error(error.message || 'Could not add collaborator'); }
  };

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

  const persistDraft = useCallback(async () => {
    const current = payload();
    const serialized = JSON.stringify(current);
    if (serialized === lastSaved.current || busy) return;
    try {
      setAutosaveStatus('Saving to your account…');
      if (isEditing) {
        await updateDraft.mutateAsync({ id, ...current });
      } else {
        const result = await createDraft.mutateAsync(current);
        const newId = result.data?._id;
        if (newId) navigate('/drafts/' + newId + '/edit', { replace: true });
      }
      lastSaved.current = serialized;
      setAutosaveStatus('Saved to your account');
    } catch {
      setAutosaveStatus('Autosave failed — use Save draft to retry');
    }
  }, [title, content, excerpt, coverImage, tagsInput, isEditing, id, busy, updateDraft, createDraft, navigate]);

  useEffect(() => {
    if (!loaded) return undefined;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(persistDraft, 1200);
    return () => { if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current); };
  }, [loaded, title, content, excerpt, coverImage, tagsInput, persistDraft]);
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
          <div><h1>{isEditing ? 'Continue your draft' : 'Start a draft'}</h1><p>{isEditing ? 'Collaborators can edit this draft in real time.' : 'Only you can see this article until you publish it.'}</p>{isEditing && <small role="status">{collaborationStatus || (isConnected ? 'Connecting collaboration…' : 'Live collaboration offline')}</small>}</div>
          <span className="autosave-indicator" role="status" aria-live="polite">{autosaveStatus}</span>
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
        {isEditing && draft?.author && String(draft.author._id || draft.author) === String(draft.author._id || draft.author) && <section className="form-group card" style={{ padding: '1rem' }}>
          <label className="form-label" htmlFor="draft-collaborator">Invite a collaborator by username</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input id="draft-collaborator" className="form-input" value={collaboratorUsername} onChange={(event) => setCollaboratorUsername(event.target.value)} placeholder="username" maxLength={30} />
            <button type="button" className="btn btn-secondary" onClick={inviteCollaborator} disabled={!collaboratorUsername.trim()}>Invite</button>
          </div>
          <small>Only the draft owner can invite collaborators. Changes sync live while both editors are connected.</small>
        </section>}
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
