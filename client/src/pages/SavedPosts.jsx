import React from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, BookOpen, Calendar, Clock, Trash2 } from 'lucide-react';
import { useRemoveSavedPost, useSavedPosts } from '../hooks/useBlogApi';

const SavedPosts = () => {
  const { data: savedItems = [], isLoading, isError, refetch } = useSavedPosts();
  const removeSavedPost = useRemoveSavedPost();

  return (
    <main className="container" style={{ paddingTop: '3.5rem', paddingBottom: '5rem', maxWidth: '980px' }}>
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Bookmark size={26} style={{ color: 'var(--accent-primary)' }} />
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)' }}>Your reading list</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>Articles you have saved to come back to later.</p>
      </header>

      {isLoading ? (
        <div aria-live="polite" style={{ display: 'grid', gap: '1rem' }}>
          {[1, 2, 3].map((item) => <div key={item} className="skeleton" style={{ height: '150px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : isError ? (
        <section className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>We couldn't load your saved articles.</p>
          <button type="button" className="btn btn-primary" onClick={() => refetch()}>Try again</button>
        </section>
      ) : savedItems.length === 0 ? (
        <section className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <BookOpen size={42} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h2 style={{ marginBottom: '0.5rem' }}>Your reading list is empty</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Save useful articles as you explore and they will appear here.</p>
          <Link to="/" className="btn btn-primary">Explore articles</Link>
        </section>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {savedItems.map((item) => {
            const post = item.post;
            if (!post) return null;
            const postUrl = '/posts/' + (post.slug || post._id);
            return (
              <article key={item._id} className="card" style={{ display: 'flex', gap: '1.25rem', padding: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {post.coverImage && (
                  <Link to={postUrl} aria-label={'Read ' + post.title} style={{ width: '150px', maxWidth: '100%', flexShrink: 0 }}>
                    <img src={post.coverImage} alt="" loading="lazy" style={{ width: '100%', height: '105px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                  </Link>
                )}
                <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                  <Link to={postUrl} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                    <h2 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>{post.title}</h2>
                  </Link>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                    {post.excerpt || (post.content || '').replace(/[#*_`~>]/g, '').slice(0, 180)}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {post.author?.username && <span>By {post.author.username}</span>}
                    {post.createdAt && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={13} /> {new Date(post.createdAt).toLocaleDateString()}</span>}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={13} /> {Math.max(1, Math.ceil((post.content || '').length / 800))} min read</span>
                  </div>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeSavedPost.mutate(post._id)} disabled={removeSavedPost.isPending} aria-label={'Remove ' + post.title + ' from saved articles'} title="Remove from reading list">
                  <Trash2 size={14} /> Remove
                </button>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
};

export default SavedPosts;
