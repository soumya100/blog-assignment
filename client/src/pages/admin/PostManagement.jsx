import React, { useState } from 'react';
import Pagination from '../../components/Pagination';
import ConfirmModal from '../../components/ConfirmModal';
import { Search, RotateCcw, Trash2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminPosts, useRestorePost, useDeletePost } from '../../hooks/useBlogApi';

const PostManagement = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  // TanStack Query server data store
  const { data, isLoading: loading } = useAdminPosts({
    page,
    limit: 10,
    search: search || undefined,
  });
  const posts = data?.posts || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1 };

  // Mutations with auto-dismissing toasts
  const restorePostMutation = useRestorePost();
  const deletePostMutation = useDeletePost();
  const actionLoading = restorePostMutation.isPending || deletePostMutation.isPending;

  const handleRestore = async (post) => {
    await restorePostMutation.mutateAsync(post._id);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPost) return;
    await deletePostMutation.mutateAsync(selectedPost._id);
    setDeleteModalOpen(false);
    setSelectedPost(null);
  };

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem' }}>Post Directory & Moderation</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Inspect published and soft-deleted articles with single-click restoration.
          </p>
        </div>

        <div style={{ position: 'relative', width: '260px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.25rem', height: '2.4rem', fontSize: '0.875rem' }}
            placeholder="Search article title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Status</th>
              <th>Published</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  Loading articles...
                </td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No posts found.
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr key={post._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600 }}>{post.title}</span>
                      {!post.isDeleted && (
                        <Link
                          to={`/posts/${post.slug || post._id}`}
                          target="_blank"
                          title="View public article"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <ExternalLink size={13} />
                        </Link>
                      )}
                    </div>
                  </td>

                  <td>{post.author?.username || 'Unknown'}</td>

                  <td>
                    {post.isDeleted ? (
                      <span className="badge badge-danger">Soft-Deleted</span>
                    ) : (
                      <span className="badge badge-success">Published</span>
                    )}
                  </td>

                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {new Date(post.createdAt).toLocaleDateString()}
                  </td>

                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {post.isDeleted ? (
                        <button
                          onClick={() => handleRestore(post)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          <RotateCcw size={13} />
                          Restore
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedPost(post);
                            setDeleteModalOpen(true);
                          }}
                          className="btn btn-outline-danger btn-sm"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        pagination={pagination}
        onPageChange={(newPage) => setPage(newPage)}
      />

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Soft Delete Article"
        message={`Are you sure you want to delete "${selectedPost?.title}"? You can restore it at any time from this panel.`}
        confirmText="Confirm Delete"
        isDanger={true}
        isLoading={actionLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelectedPost(null);
        }}
      />
    </div>
  );
};

export default PostManagement;
