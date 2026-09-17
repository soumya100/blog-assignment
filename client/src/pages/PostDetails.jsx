import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ConfirmModal from '../components/ConfirmModal';
import {
  Calendar,
  Clock,
  User as UserIcon,
  Tag,
  Edit3,
  Trash2,
  Send,
  MessageSquare,
  ArrowLeft,
  Share2,
} from 'lucide-react';

const PostDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { socket } = useSocket();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState('');

  // Editing Comment state
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');

  // Confirm delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'post' | 'comment', id }
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch post details and comments
  useEffect(() => {
    const fetchPostData = async () => {
      setLoading(true);
      try {
        const postRes = await apiClient.get(`/posts/${id}`);
        const currentPost = postRes.data.data;
        setPost(currentPost);

        const commentsRes = await apiClient.get(`/posts/${currentPost._id}/comments`);
        setComments(commentsRes.data.data);
      } catch (err) {
        console.error('Failed to fetch post:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPostData();
  }, [id]);

  // Join socket room for real-time comments
  useEffect(() => {
    if (!socket || !post?._id) return;

    socket.emit('join_post', post._id);

    const handleNewComment = (newComment) => {
      setComments((prev) => {
        if (prev.some((c) => c._id === newComment.id || c._id === newComment._id)) return prev;
        return [
          {
            _id: newComment.id || newComment._id,
            content: newComment.content,
            author: newComment.author,
            createdAt: newComment.createdAt,
          },
          ...prev,
        ];
      });
    };

    socket.on('new_comment', handleNewComment);

    return () => {
      socket.emit('leave_post', post._id);
      socket.off('new_comment', handleNewComment);
    };
  }, [socket, post?._id]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    setCommentError('');
    try {
      const res = await apiClient.post(`/posts/${post._id}/comments`, {
        content: commentText.trim(),
      });
      const created = res.data.data;
      setComments((prev) => [created, ...prev.filter((c) => c._id !== created._id)]);
      setCommentText('');
    } catch (err) {
      setCommentError(err.response?.data?.error?.message || 'Failed to submit comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editCommentText.trim()) return;
    try {
      const res = await apiClient.patch(`/comments/${commentId}`, {
        content: editCommentText.trim(),
      });
      setComments((prev) =>
        prev.map((c) => (c._id === commentId ? { ...c, content: res.data.data.content } : c))
      );
      setEditingCommentId(null);
      setEditCommentText('');
    } catch (err) {
      alert('Failed to update comment: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const confirmDeleteAction = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'post') {
        await apiClient.delete(`/posts/${post._id}`);
        navigate('/');
      } else if (deleteTarget.type === 'comment') {
        await apiClient.delete(`/comments/${deleteTarget.id}`);
        setComments((prev) => prev.filter((c) => c._id !== deleteTarget.id));
        setDeleteModalOpen(false);
      }
    } catch (err) {
      alert('Action failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="container-narrow" style={{ paddingTop: '4rem' }}>
        <div className="skeleton" style={{ width: '30%', height: '1.5rem', marginBottom: '1.5rem' }}></div>
        <div className="skeleton" style={{ width: '90%', height: '3rem', marginBottom: '1rem' }}></div>
        <div className="skeleton" style={{ width: '100%', height: '12rem', marginBottom: '2rem' }}></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container-narrow" style={{ paddingTop: '5rem', textAlign: 'center' }}>
        <h2>Post Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '1rem 0 2rem 0' }}>
          The requested article may have been deleted or moved.
        </p>
        <Link to="/" className="btn btn-primary">
          Back to Articles
        </Link>
      </div>
    );
  }

  const isPostAuthor = user && post.author && (user._id === post.author._id || user._id === post.author);
  const canManagePost = isPostAuthor || isAdmin;

  return (
    <article className="container-narrow" style={{ paddingTop: '3rem' }}>
      {/* Back Link */}
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--text-muted)',
          fontSize: '0.875rem',
          marginBottom: '2rem',
          fontWeight: 500,
        }}
      >
        <ArrowLeft size={16} />
        Back to all articles
      </Link>

      {/* Post Header */}
      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {(post.tags || []).map((tag, i) => (
            <span key={i} className="badge badge-primary">
              #{tag}
            </span>
          ))}
        </div>

        <h1
          style={{
            fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
            lineHeight: 1.25,
            marginBottom: '1.25rem',
          }}
        >
          {post.title}
        </h1>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div
              style={{
                width: '3rem',
                height: '3rem',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
                fontWeight: 700,
                fontSize: '1.1rem',
              }}
            >
              {post.author?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                {post.author?.username || 'Author'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                <Calendar size={13} />
                {new Date(post.createdAt).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>

          {/* Action buttons if owner / admin */}
          {canManagePost && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link to={`/posts/${post._id}/edit`} className="btn btn-secondary btn-sm">
                <Edit3 size={15} />
                Edit Post
              </Link>
              <button
                onClick={() => {
                  setDeleteTarget({ type: 'post', id: post._id });
                  setDeleteModalOpen(true);
                }}
                className="btn btn-outline-danger btn-sm"
              >
                <Trash2 size={15} />
                Delete
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Post Body */}
      <div
        style={{
          fontSize: '1.075rem',
          lineHeight: 1.8,
          color: 'var(--text-primary)',
          whiteSpace: 'pre-line',
          marginBottom: '4rem',
        }}
      >
        {post.content}
      </div>

      {/* Author Bio Box */}
      {post.author?.bio && (
        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            marginBottom: '4rem',
            background: 'var(--bg-elevated)',
          }}
        >
          <div
            style={{
              width: '3.5rem',
              height: '3.5rem',
              borderRadius: 'var(--radius-full)',
              background: 'var(--accent-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.25rem',
              flexShrink: 0,
            }}
          >
            {post.author.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>About {post.author.username}</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{post.author.bio}</p>
          </div>
        </div>
      )}

      {/* Comments Section */}
      <section style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '2rem' }}>
          <MessageSquare size={22} style={{ color: 'var(--accent-primary)' }} />
          <h2 style={{ fontSize: '1.35rem' }}>Discussion ({comments.length})</h2>
        </div>

        {/* Comment Input */}
        {isAuthenticated ? (
          <form onSubmit={handleAddComment} style={{ marginBottom: '2.5rem' }}>
            <div className="form-group">
              <textarea
                className="form-textarea"
                placeholder="Write a constructive response or question..."
                style={{ minHeight: '100px' }}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              {commentError && <div className="form-error">{commentError}</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                className="btn btn-primary btn-sm"
              >
                <Send size={14} />
                {submittingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
        ) : (
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '1.75rem',
              marginBottom: '2.5rem',
              background: 'var(--bg-elevated)',
            }}
          >
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Sign in to participate in technical discussions and leave comments.
            </p>
            <Link to="/login" className="btn btn-primary btn-sm">
              Log In to Comment
            </Link>
          </div>
        )}

        {/* Comments List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {comments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
              No comments yet. Be the first to start the discussion!
            </p>
          ) : (
            comments.map((comment) => {
              const isCommentAuthor =
                user && comment.author && (user._id === comment.author._id || user._id === comment.author);
              const canManageComment = isCommentAuthor || isAdmin;

              return (
                <div
                  key={comment._id}
                  className="card"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    padding: '1.25rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div
                        style={{
                          width: '2rem',
                          height: '2rem',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: 'var(--accent-primary)',
                        }}
                      >
                        {comment.author?.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                          {comment.author?.username || 'Anonymous'}
                        </span>
                        {comment.author?.role === 'ADMIN' && (
                          <span
                            className="badge badge-primary"
                            style={{ fontSize: '0.65rem', marginLeft: '0.5rem', padding: '0.1rem 0.4rem' }}
                          >
                            Staff
                          </span>
                        )}
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Manage comment options */}
                    {canManageComment && (
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {isCommentAuthor && (
                          <button
                            onClick={() => {
                              setEditingCommentId(comment._id);
                              setEditCommentText(comment.content);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.5rem' }}
                            title="Edit comment"
                          >
                            <Edit3 size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setDeleteTarget({ type: 'comment', id: comment._id });
                            setDeleteModalOpen(true);
                          }}
                          className="btn btn-outline-danger btn-sm"
                          style={{ padding: '0.25rem 0.5rem' }}
                          title="Delete comment"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Comment Content or Edit Form */}
                  {editingCommentId === comment._id ? (
                    <div>
                      <textarea
                        className="form-textarea"
                        style={{ minHeight: '80px', marginBottom: '0.5rem' }}
                        value={editCommentText}
                        onChange={(e) => setEditCommentText(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setEditingCommentId(null)}
                          className="btn btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdateComment(comment._id)}
                          className="btn btn-primary btn-sm"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-primary)', fontSize: '0.925rem', whiteSpace: 'pre-line' }}>
                      {comment.content}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title={deleteTarget?.type === 'post' ? 'Delete Blog Article' : 'Delete Comment'}
        message={
          deleteTarget?.type === 'post'
            ? 'Are you sure you want to delete this article? It will be soft-deleted from public view.'
            : 'Are you sure you want to remove this comment?'
        }
        confirmText="Delete"
        isDanger={true}
        isLoading={isDeleting}
        onConfirm={confirmDeleteAction}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
      />
    </article>
  );
};

export default PostDetails;
