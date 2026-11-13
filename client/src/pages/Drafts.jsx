import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Trash2, Clock } from 'lucide-react';
import { useDeleteDraft, useDrafts } from '../hooks/useBlogApi';
import ConfirmModal from '../components/ConfirmModal';

const Drafts = () => {
  const { data: drafts = [], isLoading, isError, refetch } = useDrafts();
  const deleteDraft = useDeleteDraft();
  const [draftToDelete, setDraftToDelete] = useState(null);

  const handleDelete = async () => {
    if (!draftToDelete || deleteDraft.isPending) return;
    try {
      await deleteDraft.mutateAsync(draftToDelete._id);
      setDraftToDelete(null);
    } catch {
      // The mutation hook surfaces the failure through the application's toast/error handling.
    }
  };

  const closeDeleteModal = () => {
    if (!deleteDraft.isPending) setDraftToDelete(null);
  };

  return (
    <main className="container" style={{ maxWidth: '980px', paddingTop: '3.5rem', paddingBottom: '5rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div><h1 style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>Your drafts</h1><p style={{ color: 'var(--text-secondary)' }}>Private articles that are saved to your account.</p></div>
        <Link to="/drafts/new" className="btn btn-primary"><Plus size={16} /> New draft</Link>
      </header>
      {isLoading ? <div className="skeleton" style={{ height: '12rem' }} /> : isError ? (
        <section className="card" style={{ padding: '2rem', textAlign: 'center' }}><p>Unable to load your drafts.</p><button className="btn btn-primary" onClick={() => refetch()}>Try again</button></section>
      ) : drafts.length === 0 ? (
        <section className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}><FileText size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} /><h2>No drafts yet</h2><p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 1.25rem' }}>Start writing and save your work privately. Publish whenever you're ready.</p><Link to="/drafts/new" className="btn btn-primary">Create a draft</Link></section>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {drafts.map((draft) => (
            <article key={draft._id} className="card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                <h2 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}><Link to={'/drafts/' + draft._id + '/edit'}>{draft.title || 'Untitled draft'}</Link></h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '0.5rem' }}>{draft.excerpt || (draft.content || '').replace(/[#*_\x60~>]/g, '').slice(0, 160) || 'No content yet'}</p>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}><Clock size={13} /> Updated {new Date(draft.updatedAt).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to={'/drafts/' + draft._id + '/edit'} className="btn btn-secondary btn-sm">Continue editing</Link>
                <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setDraftToDelete(draft)} disabled={deleteDraft.isPending} aria-label={`Delete ${draft.title || 'untitled draft'}`}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <ConfirmModal
        isOpen={Boolean(draftToDelete)}
        title="Delete this draft?"
        message={`“${draftToDelete?.title || 'Untitled draft'}” will be permanently deleted. This action cannot be undone.`}
        confirmText="Delete draft"
        isDanger
        isLoading={deleteDraft.isPending}
        onCancel={closeDeleteModal}
        onConfirm={handleDelete}
      />
    </main>
  );
};

export default Drafts;
