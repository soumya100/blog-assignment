import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { User, Shield, Mail, Calendar, Edit3, Trash2, BookOpen, Camera, Plus } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import EditProfileModal from '../components/EditProfileModal';
import { usePosts, useDeletePost, useUpdateProfile } from '../hooks/useBlogApi';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  // TanStack Query server data store
  const { data, isLoading: loading } = usePosts({
    author: user?._id,
    limit: 20,
  });
  const myPosts = data?.posts || [];

  // TanStack Query Mutations with auto-dismissing toast
  const deletePostMutation = useDeletePost();
  const updateProfileMutation = useUpdateProfile({ errorToast: false });

  const handleSaveProfile = async (profileData) => {
    const res = await updateProfileMutation.mutateAsync(profileData);
    const updatedUser = res?.data?.user || res?.data;
    if (updatedUser) {
      updateUser(updatedUser);
    }
    setEditProfileOpen(false);
  };

  const handleDeletePost = async () => {
    if (!selectedPostId) return;
    await deletePostMutation.mutateAsync(selectedPostId);
    setDeleteModalOpen(false);
    setSelectedPostId(null);
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
        {/* Clickable Profile Avatar with Edit Badge */}
        <div
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={() => setEditProfileOpen(true)}
          title="Click to customize profile picture or avatar"
        >
          <div
            style={{
              width: '5.25rem',
              height: '5.25rem',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 700,
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.35)',
              border: '2px solid rgba(255, 255, 255, 0.15)',
              transition: 'transform 0.2s ease',
            }}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              user?.username?.charAt(0).toUpperCase() || 'U'
            )}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              background: 'var(--accent-primary)',
              color: '#ffffff',
              borderRadius: '50%',
              width: '1.65rem',
              height: '1.65rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--bg-surface)',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
            }}
            title="Update photo or avatar"
          >
            <Camera size={11} />
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '240px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              marginBottom: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.75rem' }}>{user?.username}</h1>
              <span
                className={`badge ${user?.role === 'ADMIN' ? 'badge-primary' : 'badge-success'}`}
              >
                {user?.role === 'ADMIN' ? 'Administrator' : 'Standard Author'}
              </span>
            </div>

            {/* Edit Profile Action Button */}
            <button
              type="button"
              onClick={() => setEditProfileOpen(true)}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.85rem',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-sm)',
              }}
              title="Edit bio description and profile avatar"
            >
              <Edit3 size={13} />
              <span>Edit Profile</span>
            </button>
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

          {/* User Bio / Description */}
          {user?.bio ? (
            <p
              style={{
                marginTop: '0.85rem',
                color: 'var(--text-primary)',
                fontSize: '0.925rem',
                lineHeight: 1.6,
                maxWidth: '680px',
              }}
            >
              {user.bio}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setEditProfileOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-primary)',
                fontSize: '0.85rem',
                marginTop: '0.75rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: 0,
                fontWeight: 500,
              }}
            >
              <Plus size={14} /> Add a description or bio about yourself
            </button>
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
        message={
          user?.role === 'ADMIN'
            ? 'Are you sure you want to delete this article? As an administrator, it will be soft-deleted and you can restore it at any time from the Admin Panel.'
            : 'Are you sure you want to delete this article? It will be soft-deleted and can be recovered by an administrator.'
        }
        confirmText="Delete"
        isDanger={true}
        onConfirm={handleDeletePost}
        onCancel={() => setDeleteModalOpen(false)}
      />

      {/* Edit Profile Modal (Avatar Photo / Presets & Bio) */}
      <EditProfileModal
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        currentUser={user}
        onSave={handleSaveProfile}
        isLoading={updateProfileMutation.isPending}
      />
    </div>
  );
};

export default Profile;
