import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import apiClient from '../api/client';

export default function PublicContentGroup() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    apiClient.get('/library/public/' + id)
      .then((response) => { if (active) setGroup(response.data); })
      .catch((requestError) => { if (active) setError(requestError.message || 'This series or collection is unavailable.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  if (loading) return <main className="container" style={{ padding: '3rem 0' }} role="status">Loading reading list…</main>;
  if (error || !group) return <main className="container" style={{ padding: '3rem 0' }}><h1>Reading list unavailable</h1><p>{error || 'This group may be private or removed.'}</p></main>;
  return <main className="container-narrow" style={{ padding: '3rem 0 4rem' }}>
    <small>{group.kind.toUpperCase()}</small><h1>{group.title}</h1><p style={{ color: 'var(--text-secondary)', margin: '0.75rem 0 2rem' }}>{group.description}</p>
    <ol style={{ display: 'grid', gap: '1rem', paddingLeft: '1.5rem' }}>
      {(group.posts || []).map((post) => <li key={post._id} className="card" style={{ padding: '1rem' }}><Link to={'/posts/' + post.slug}><strong>{post.title}</strong></Link><p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{post.excerpt}</p><small>By {post.author?.username || 'DevLog author'}</small></li>)}
    </ol>
  </main>;
}
