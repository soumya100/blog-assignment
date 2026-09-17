import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { Link } from 'react-router-dom';
import { User, Shield, Mail, Calendar, Edit3, Trash2, BookOpen } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const Profile = () => {
  const { user } = useAuth();
  const [myPosts, setMyPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);

  useEffect(() => {
    const fetchMyPosts = async () => {
      if (!user?._id) return;
      try {
        const res = await apiClient.get('/posts', {
          params: { author: user._id, limit: 20 },
        });
        setMyPosts(res.data.data);
      } catch (err) {
        console.error('Failed to load user posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyPosts();
  }, [user?._id]);

  const handleDeletePost = async () => {
    if (!selectedPostId) return;
    try {
      await apiClient.delete(`/posts/${selectedPostId}`);
      setMyPosts((prev) => prev.filter((p) => p._id !== selectedPostId));
      setDeleteModalOpen(false);
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  return (
    <div className="container" style={{ paddingTop: '3.5rem' }}>
      {/* Profile Header Card */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          padding: '2.5rem',
          marginBottom: '3rem',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: '5rem',
            height: '5rem',
            borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: 700,
          }}
        >
          {user?.username?.charAt(0).toUpperCase() || 'U'}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h1 style={{ fontSize: '1.75rem' }}>{user?.username}</h1>
            <span
              className={`badge ${user?.role === 'ADMIN' ? 'badge-primary' : 'badge-success'}`}
            >
              {user?.role === 'ADMIN' ? 'Administrator' : 'Standard Author'}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '1.5rem',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Mail size={14} />
              {user?.email}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={14} />
              Member since {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
            </div>
          </div>
          {user?.bio && (
            <p style={{ marginTop: '0.75rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
              {user.bio}
            </p>
          )}
        </div>
      </div>

      {/* Authored Posts Section */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={20} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ fontSize: '1.35rem' }}>My Authored Articles ({myPosts.length})</h2>
          </div>
          <Link to="/posts/new" className="btn btn-primary btn-sm">
            + Write New Article
          </Link>
        </div>

        {loading ? (
          <p>Loading authored posts...</p>
        ) : myPosts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              You haven't authored any articles yet.
            </p>
            <Link to="/posts/new" className="btn btn-primary btn-sm">
              Create Your First Post
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {myPosts.map((post) => (
              <div
                key={post._id}
                className="card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1.25rem 1.5rem',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>
                    <Link to={`/posts/${post.slug || post._id}`}>{post.title}</Link>
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    <span>{post.commentsCount || 0} comments</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link to={`/posts/${post._id}/edit`} className="btn btn-secondary btn-sm">
                    <Edit3 size={14} />
                    Edit
                  </Link>
                  <button
                    onClick={() => {
                      setSelectedPostId(post._id);
                      setDeleteModalOpen(true);
                    }}
                    className="btn btn-outline-danger btn-sm"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Article"
        message="Are you sure you want to delete this article? This action soft-deletes it."
        confirmText="Delete"
        isDanger={true}
        onConfirm={handleDeletePost}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};

export default Profile;
