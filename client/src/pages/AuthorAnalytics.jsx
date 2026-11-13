import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { toast } from 'react-toastify';

export default function AuthorAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    apiClient.get('/analytics/author')
      .then((response) => { if (active) setData(response.data); })
      .catch((error) => toast.error(error.message || 'Unable to load analytics'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  if (loading) return <main className="container" style={{ padding: '3rem 0' }} role="status">Loading author analytics…</main>;
  if (!data) return <main className="container" style={{ padding: '3rem 0' }}>Analytics are currently unavailable.</main>;
  return (
    <main className="container" style={{ padding: '2.5rem 0 4rem', maxWidth: 1000 }}>
      <h1>Author analytics</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Daily unique reader views, deduplicated per article and day.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}><small>Total views</small><h2>{data.totalViews}</h2></div>
        <div className="card" style={{ padding: '1.25rem' }}><small>Published articles</small><h2>{data.publishedArticles}</h2></div>
      </div>
      <section className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Top articles</h2>
        {data.topPosts?.length ? data.topPosts.map((post) => <div key={post._id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.7rem 0', borderBottom: '1px solid var(--border-subtle)' }}><Link to={'/posts/' + post.slug}>{post.title}</Link><strong>{post.views} views</strong></div>) : <p>No views recorded yet.</p>}
      </section>
      <section className="card" style={{ padding: '1.25rem' }}>
        <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Last 30 days</h2>
        {data.daily?.length ? <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end', minHeight: 140, overflowX: 'auto' }}>
          {data.daily.map((day) => <div key={day._id} title={day._id + ': ' + day.views + ' views'} style={{ minWidth: 24, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'end', textAlign: 'center' }}><span style={{ fontSize: '0.7rem' }}>{day.views}</span><div style={{ height: Math.max(4, Math.min(100, day.views / Math.max(1, ...data.daily.map((item) => item.views)) * 100)) + 'px', background: 'var(--accent-primary)', borderRadius: '4px 4px 0 0' }} /><small>{day._id.slice(5)}</small></div>)}
        </div> : <p>No daily data yet.</p>}
      </section>
    </main>
  );
}
