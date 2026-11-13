import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Bookmark, Clock3, History, ArrowRight, Trash2, Compass } from 'lucide-react';
import { usePosts, useSavedPosts, useDrafts, useReadingHistory, useClearReadingHistory } from '../hooks/useBlogApi';

const minutes = (content = '') => Math.max(1, Math.ceil(content.trim().split(/\s+/).filter(Boolean).length / 200));
const articleHref = (post) => '/posts/' + (post.slug || post._id);

const ReaderDashboard = () => {
  const { data: history = [], isLoading: historyLoading } = useReadingHistory();
  const { data: saved = [], isLoading: savedLoading } = useSavedPosts();
  const { data: drafts = [] } = useDrafts();
  const { data: latestData, isLoading: postsLoading } = usePosts({ limit: 8 });
  const clearHistory = useClearReadingHistory();
  const latest = latestData?.posts || [];
  const readIds = new Set(history.map((item) => item.post?._id).filter(Boolean));
  const recommendations = latest.filter((post) => !readIds.has(post._id)).slice(0, 4);
  const totalMinutes = history.reduce((sum, item) => sum + minutes(item.post?.content), 0);

  const panel = { background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' };
  const muted = { color: 'var(--text-secondary)' };
  const heading = { fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.35rem' };

  return (
    <main className="container" style={{ maxWidth: '1120px', paddingTop: '2.5rem', paddingBottom: '5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div>
          <p style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '.78rem', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '.45rem' }}>Your reading space</p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', marginBottom: '.45rem' }}>Reader dashboard</h1>
          <p style={muted}>Pick up where you left off, revisit saved stories and discover something new.</p>
        </div>
        <Link to="/" className="btn btn-primary"><Compass size={16} /> Explore articles</Link>
      </header>

      <section aria-label="Reading overview" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Recently read', value: history.length, icon: History },
          { label: 'Saved articles', value: saved.length, icon: Bookmark },
          { label: 'Estimated reading', value: totalMinutes + ' min', icon: Clock3 },
          { label: 'Your drafts', value: drafts.length, icon: BookOpen },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} style={panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.9rem' }}>
              <span style={muted}>{label}</span><Icon size={18} color="var(--accent-primary)" />
            </div>
            <strong style={{ fontSize: '1.8rem', fontVariantNumeric: 'tabular-nums' }}>{value}</strong>
          </div>
        ))}
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div><h2 style={heading}>Continue reading</h2><p style={muted}>Your latest reading activity, saved automatically as you read.</p></div>
          {history.length > 0 && <button type="button" className="btn btn-secondary btn-sm" onClick={() => clearHistory.mutate()} disabled={clearHistory.isPending}><Trash2 size={14} /> Clear history</button>}
        </div>
        {historyLoading ? <p aria-live="polite" style={muted}>Loading your reading history…</p> : history.length === 0 ? (
          <div style={{ ...panel, textAlign: 'center', padding: '2.5rem 1rem' }}><History size={28} color="var(--text-muted)" /><h3 style={{ margin: '.6rem 0' }}>Your reading history starts here</h3><p style={muted}>Open an article while signed in and it will appear here.</p></div>
        ) : (
          <div style={{ display: 'grid', gap: '.8rem' }}>
            {history.filter((item) => item.post).slice(0, 5).map((item) => (
              <article key={item._id} style={{ ...panel, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {item.post.coverImage ? <img src={item.post.coverImage} alt="" loading="lazy" style={{ width: '112px', height: '76px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} /> : <div style={{ width: '112px', height: '76px', display: 'grid', placeItems: 'center', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}><BookOpen color="var(--text-muted)" /></div>}
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <Link to={articleHref(item.post)} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 700 }}>{item.post.title}</Link>
                  <p style={{ ...muted, fontSize: '.82rem', marginTop: '.35rem' }}>By {item.post.author?.username || 'Unknown author'} · {minutes(item.post.content)} min read · {Math.round(item.progress || 0)}% progress</p>
                  <div role="progressbar" aria-label={'Reading progress for ' + item.post.title} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(item.progress || 0)} style={{ height: '5px', background: 'var(--bg-elevated)', borderRadius: '99px', overflow: 'hidden', marginTop: '.55rem' }}><div style={{ width: (item.progress || 0) + '%', height: '100%', background: 'var(--accent-primary)' }} /></div>
                </div>
                <Link to={articleHref(item.post)} className="btn btn-secondary btn-sm">Continue <ArrowRight size={14} /></Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div><h2 style={heading}>Your reading list</h2><p style={muted}>Stories you saved for later.</p></div>
          <Link to="/saved" className="btn btn-secondary btn-sm">View all <ArrowRight size={14} /></Link>
        </div>
        {savedLoading ? <p style={muted}>Loading saved articles…</p> : saved.length === 0 ? <div style={panel}><p style={muted}>No saved articles yet. Bookmark an article to keep it close.</p></div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {saved.filter((item) => item.post).slice(0, 3).map((item) => <article key={item._id} style={panel}>
              {item.post.coverImage && <img src={item.post.coverImage} alt="" loading="lazy" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '.8rem' }} />}
              <Link to={articleHref(item.post)} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 700 }}>{item.post.title}</Link>
              <p style={{ ...muted, fontSize: '.82rem', marginTop: '.4rem' }}>{item.post.author?.username || 'Unknown author'}</p>
            </article>)}
          </div>
        )}
      </section>

      <section>
        <div style={{ marginBottom: '1rem' }}><h2 style={heading}>Discover something new</h2><p style={muted}>Recent articles you have not opened yet.</p></div>
        {postsLoading ? <p style={muted}>Finding articles…</p> : recommendations.length === 0 ? <div style={panel}><p style={muted}>You are all caught up. Explore the full publication for more articles.</p><Link to="/" className="btn btn-primary btn-sm" style={{ marginTop: '.8rem' }}>Browse all articles</Link></div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {recommendations.map((post) => <article key={post._id} style={panel}>
              {post.coverImage && <img src={post.coverImage} alt="" loading="lazy" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '.8rem' }} />}
              <Link to={articleHref(post)} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 700 }}>{post.title}</Link>
              <p style={{ ...muted, fontSize: '.85rem', marginTop: '.45rem' }}>{post.excerpt || (post.content || '').slice(0, 130)}</p>
            </article>)}
          </div>
        )}
      </section>
    </main>
  );
};

export default ReaderDashboard;
