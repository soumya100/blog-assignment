import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../api/client';

export default function Mentions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    apiClient.get('/mentions').then((response) => { if (active) setItems(response.data || []); })
      .catch((error) => toast.error(error.message || 'Unable to load mentions'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const markRead = async (id) => {
    try {
      await apiClient.patch('/mentions/' + id + '/read', {});
      setItems((current) => current.map((item) => item._id === id ? { ...item, readAt: new Date().toISOString() } : item));
    } catch (error) { toast.error(error.message || 'Unable to update mention'); }
  };
  return <main className="container-narrow" style={{ padding: '2.5rem 0 4rem' }}>
    <h1>Mentions</h1><p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 1.5rem' }}>Comments that mention your @username.</p>
    {loading ? <p role="status">Loading mentions…</p> : items.length === 0 ? <div className="card" style={{ padding: '2rem' }}>No mentions yet. Someone can mention you in a comment using @username.</div> : <div style={{ display: 'grid', gap: '0.75rem' }}>{items.map((item) => <article key={item._id} className="card" style={{ padding: '1.25rem', opacity: item.readAt ? 0.75 : 1 }}>
      <p><strong>@{item.actor?.username || 'Someone'}</strong> mentioned you in <Link to={'/posts/' + (item.post?.slug || item.post?._id)}>{item.post?.title || 'an article'}</Link>.</p>
      <blockquote style={{ margin: '0.75rem 0', color: 'var(--text-secondary)' }}>{item.comment?.content || 'Comment unavailable'}</blockquote>
      {!item.readAt && <button type="button" className="btn btn-secondary btn-sm" onClick={() => markRead(item._id)}>Mark as read</button>}
    </article>)}</div>}
  </main>;
}
