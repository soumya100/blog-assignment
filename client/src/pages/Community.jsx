import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Community() {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState('trending');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const endpoint = tab === 'following' ? '/community/feed/following' : '/community/trending';
    apiClient.get(endpoint)
      .then((response) => { if (active) setPosts(response.data || []); })
      .catch((error) => { if (active) toast.error(error.message || 'Could not load community feed'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tab]);

  return (
    <main className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem', maxWidth: 920 }}>
      <header style={{ marginBottom: '1.5rem' }}><h1>Community</h1><p style={{ color: 'var(--text-secondary)' }}>Discover popular articles and keep up with authors you follow.</p></header>
      <div role="tablist" aria-label="Community feeds" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button type="button" role="tab" aria-selected={tab === 'trending'} className={tab === 'trending' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setTab('trending')}>Trending</button>
        <button type="button" role="tab" aria-selected={tab === 'following'} className={tab === 'following' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setTab('following')}>Following</button>
      </div>
      {tab === 'following' && !isAuthenticated ? <div className="card" style={{ padding: '2rem' }}>Sign in to see articles from authors you follow.</div>
        : loading ? <p role="status">Loading feed…</p>
          : posts.length === 0 ? <div className="card" style={{ padding: '2rem' }}>{tab === 'following' ? 'Follow authors to build your personalized feed.' : 'No trending articles yet.'}</div>
            : <div style={{ display: 'grid', gap: '1rem' }}>{posts.map((post) => <article className="card" key={post._id} style={{ padding: '1.25rem' }}>
              <h2 style={{ fontSize: '1.2rem' }}><Link to={'/posts/' + (post.slug || post._id)}>{post.title}</Link></h2>
              <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0' }}>{post.excerpt || post.content?.slice(0, 180)}</p>
              <small style={{ color: 'var(--text-muted)' }}>By {post.author?.username || 'DevLog author'} · {new Date(post.createdAt).toLocaleDateString()}</small>
            </article>)}</div>}
    </main>
  );
}
