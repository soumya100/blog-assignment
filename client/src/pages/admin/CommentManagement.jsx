import React, { useState } from 'react';
import Pagination from '../../components/Pagination';
import ConfirmModal from '../../components/ConfirmModal';
import { Trash2, MessageSquare, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminComments, useDeleteComment } from '../../hooks/useBlogApi';

const CommentManagement = () => {
  const [page, setPage] = useState(1);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState(null);

  // TanStack Query server data store
  const { data, isLoading: loading } = useAdminComments({
    page,
    limit: 12,
  });
  const comments = data?.comments || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1 };

  // TanStack Query Mutation with auto-dismissing toast
  const deleteCommentMutation = useDeleteComment();
  const actionLoading = deleteCommentMutation.isPending;

  const handleDeleteConfirm = async () => {
    if (!selectedComment) return;
    await deleteCommentMutation.mutateAsync(selectedComment._id);
    setDeleteModalOpen(false);
    setSelectedComment(null);
  };

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem' }}>Comment Moderation</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Inspect and moderate user comments across all blog articles.
        </p>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Comment Preview</th>
              <th>Author</th>
              <th>Target Article</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  Loading comments...
                </td>
              </tr>
            ) : comments.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No comments in database.
                </td>
              </tr>
            ) : (
              comments.map((c) => (
                <tr key={c._id}>
                  <td style={{ maxWidth: '280px' }}>
                    <div style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.content}
                    </div>
                  </td>
                  <td>{c.author?.username || 'Unknown'}</td>
                  <td>
                    {c.post ? (
                      <Link
                        to={`/posts/${c.post.slug || c.post._id}`}
                        target="_blank"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem' }}
                      >
                        <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.post.title}
                        </span>
                        <ExternalLink size={12} />
                      </Link>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Deleted Post</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        setSelectedComment(c);
                        setDeleteModalOpen(true);
                      }}
                      className="btn btn-outline-danger btn-sm"
                      style={{ padding: '0.25rem 0.5rem' }}
                      title="Moderate & delete comment"
                    >
                      <Trash2 size={13} />
                    </button>
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
        title="Delete Inappropriate Comment"
        message="Are you sure you want to remove this comment as an administrator?"
        confirmText="Confirm Delete"
        isDanger={true}
        isLoading={actionLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelectedComment(null);
        }}
      />
    </div>
  );
};

export default CommentManagement;
