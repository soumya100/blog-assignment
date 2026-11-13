import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ContentLibrary() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [posts, setPosts] = useState([]);
  const [kind, setKind] = useState('series');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try {
      const [groupsResponse, postsResponse] = await Promise.all([
        apiClient.get('/library'),
        apiClient.get('/posts', { params: { author: user?._id, limit: 100 } }),
      ]);
      setGroups(groupsResponse.data || []);
      setPosts(postsResponse.data || []);
    } catch (error) { toast.error(error.message || 'Unable to load content library'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [user?._id]);
  const createGroup = async (event) => {
    event.preventDefault();
    try {
      await apiClient.post('/library', { kind, title, description, posts: selected, isPublic: true });
      setTitle(''); setDescription(''); setSelected([]);
      toast.success(kind === 'series' ? 'Series created' : 'Collection created');
      load();
    } catch (error) { toast.error(error.message || 'Unable to create group'); }
  };
  const removeGroup = async (id) => {
    try { await apiClient.delete('/library/' + id); setGroups((items) => items.filter((item) => item._id !== id)); }
    catch (error) { toast.error(error.message || 'Unable to delete group'); }
  };
  return <main className="container" style={{ padding: '2.5rem 0 4rem', maxWidth: 1000 }}>
    <h1>Series and collections</h1>
    <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 1.5rem' }}>Organize your published articles into learning paths and curated reading lists.</p>
    <form className="card" onSubmit={createGroup} style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'grid', gap: '0.8rem' }}>
      <h2 style={{ fontSize: '1.15rem' }}>Create a group</h2>
      <label className="form-label">Type <select className="form-input" value={kind} onChange={(event) => setKind(event.target.value)}><option value="series">Series (ordered learning path)</option><option value="collection">Collection (curated list)</option></select></label>
      <label className="form-label">Title <input className="form-input" required minLength={2} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label className="form-label">Description <textarea className="form-textarea" maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <fieldset style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '0.8rem' }}><legend>Include published articles</legend>
        {posts.length === 0 ? <p>No published articles available yet.</p> : posts.map((post) => <label key={post._id} style={{ display: 'flex', gap: '0.5rem', padding: '0.25rem 0' }}><input type="checkbox" checked={selected.includes(post._id)} onChange={(event) => setSelected((items) => event.target.checked ? [...items, post._id] : items.filter((id) => id !== post._id))} />{post.title}</label>)}
      </fieldset>
      <button className="btn btn-primary" type="submit" disabled={!title.trim()}>Create {kind}</button>
    </form>
    <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Your groups</h2>
    {loading ? <p role="status">Loading…</p> : groups.length === 0 ? <p>No series or collections created yet.</p> : <div style={{ display: 'grid', gap: '1rem' }}>{groups.map((group) => <article className="card" key={group._id} style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}><div><small>{group.kind.toUpperCase()}</small><h3>{group.title}</h3><p>{group.description}</p><Link to={"/collections/" + group._id}>Open public page</Link></div><button type="button" className="btn btn-danger btn-sm" onClick={() => removeGroup(group._id)}>Delete</button></div>
      <ol>{(group.posts || []).map((post) => <li key={post._id}><Link to={'/posts/' + post.slug}>{post.title}</Link></li>)}</ol>
    </article>)}</div>}
  </main>;
}
