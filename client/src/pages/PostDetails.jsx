import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ConfirmModal from '../components/ConfirmModal';
import { queryKeys, extractErrorMessage } from '../hooks/useApi';
import {
  usePost,
  useComments,
  useCreateComment,
  useLikeComment,
  useDeleteComment,
  useDeletePost,
} from '../hooks/useBlogApi';
import CommentItem from '../components/CommentItem';

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
  Check,
  AlertCircle,
} from 'lucide-react';

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment is too long'),
});

const PostDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  // Server state with TanStack Query
  const { data: post, isLoading: postLoading } = usePost(id);
  const { data: comments = [], isLoading: commentsLoading } = useComments(post?._id);

  // TanStack Query Mutations
  const createCommentMutation = useCreateComment(post?._id);
  const likeCommentMutation = useLikeComment();
  const deleteCommentMutation = useDeleteComment(post?._id);
  const deletePostMutation = useDeletePost();

  // Edit Comment state
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);

  // Delete Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'post' | 'comment', id }
  const [copiedLink, setCopiedLink] = useState(false);

  // React Hook Form for new comments
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: '' },
  });

  // Real-time socket room synchronization
  useEffect(() => {
    if (!socket || !post?._id) return;

    socket.emit('join_post', post._id);

    const handleRefresh = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.list(post._id) });
    };

    socket.on('new_comment', handleRefresh);
    socket.on('comment_like', handleRefresh);

    return () => {
      socket.emit('leave_post', post._id);
      socket.off('new_comment', handleRefresh);
      socket.off('comment_like', handleRefresh);
    };
  }, [socket, post?._id, queryClient]);

  const onCommentSubmit = async (values) => {
    if (!post?._id) return;
    await createCommentMutation.mutateAsync({
      postId: post._id,
      content: values.content.trim(),
    });
    reset();
  };

  const onReplySubmit = async ({ parentCommentId, content }) => {
    if (!post?._id) return;
    await createCommentMutation.mutateAsync({
      postId: post._id,
      parentCommentId,
      content,
    });
  };

  const handleLikeToggle = async (commentId) => {
    await likeCommentMutation.mutateAsync({ commentId, postId: post?._id });
  };

  const handleUpdateComment = async (commentId, newContent) => {
    const textToSave = newContent !== undefined ? newContent : editCommentText;
    if (!textToSave?.trim()) return;
    setIsUpdatingComment(true);
    try {
      await apiClient.patch(`/comments/${commentId}`, {
        content: textToSave.trim(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.list(post._id) });
      toast.success('Comment updated successfully', { autoClose: 3500 });
      setEditingCommentId(null);
      setEditCommentText('');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update comment'), { autoClose: 4000 });
      throw err;
    } finally {
      setIsUpdatingComment(false);
    }
  };

  const confirmDeleteAction = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'post') {
      await deletePostMutation.mutateAsync(post._id);
      navigate('/');
    } else if (deleteTarget.type === 'comment') {
      await deleteCommentMutation.mutateAsync(deleteTarget.id);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      // navigator.clipboard requires secure context (HTTPS or localhost)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for non-secure contexts (e.g. LAN IP access)
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      toast.info('Article link copied to clipboard!', { autoClose: 3000 });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link. Please copy the URL from the address bar.', { autoClose: 3500 });
    }
  };

  if (postLoading) {
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
          color: 'var(--text-secondary)',
          fontSize: '0.875rem',
          marginBottom: '2rem',
          textDecoration: 'none',
        }}
      >
        <ArrowLeft size={16} />
        Back to all articles
      </Link>

      {/* Post Header */}
      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {(post.tags || []).map((t, idx) => (
            <span key={idx} className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
              #{t}
            </span>
          ))}
        </div>

        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', lineHeight: 1.25, marginBottom: '1.5rem' }}>
          {post.title}
        </h1>

        {/* Metadata bar */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--accent-primary)',
                }}
              >
                {post.author?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                {post.author?.username || 'Unknown Author'}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: 'var(--text-muted)',
                fontSize: '0.825rem',
              }}
            >
              <Calendar size={14} />
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: 'var(--text-muted)',
                fontSize: '0.825rem',
              }}
            >
              <Clock size={14} />
              <span>{Math.max(1, Math.ceil(post.content.length / 800))} min read</span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleShare}
              className="btn btn-secondary btn-sm"
              title="Copy share link"
            >
              {copiedLink ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Share2 size={14} />}
              {copiedLink ? 'Copied' : 'Share'}
            </button>

            {canManagePost && (
              <>
                <Link to={`/posts/${post._id}/edit`} className="btn btn-secondary btn-sm">
                  <Edit3 size={14} />
                  Edit
                </Link>
                <button
                  onClick={() => {
                    setDeleteTarget({ type: 'post', id: post._id });
                    setDeleteModalOpen(true);
                  }}
                  className="btn btn-danger btn-sm"
                  disabled={deletePostMutation.isPending}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Post Body */}
      <section
        style={{
          fontSize: '1.125rem',
          lineHeight: 1.8,
          color: 'var(--text-primary)',
          marginBottom: '4rem',
          whiteSpace: 'pre-line',
          wordBreak: 'break-word',
        }}
      >
        {post.content}
      </section>

      {/* Author Bio Card */}
      {post.author && post.author.bio && (
        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            padding: '1.5rem',
            marginBottom: '4rem',
            background: 'var(--bg-elevated)',
          }}
        >
          <div
            style={{
              width: '3.5rem',
              height: '3.5rem',
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '1.25rem',
              fontWeight: 700,
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

      {/* Facebook-Style Comments Section */}
      <section style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '2rem' }}>
          <MessageSquare size={22} style={{ color: 'var(--accent-primary)' }} />
          <h2 style={{ fontSize: '1.35rem' }}>Discussion ({comments.length})</h2>
        </div>

        {/* Facebook-style Top Composer */}
        {isAuthenticated ? (
          <form onSubmit={handleSubmit(onCommentSubmit)} noValidate className="fb-top-composer">
            <div className="fb-avatar" title={user?.username}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="fb-composer-body">
              <textarea
                className={`fb-composer-input ${errors.content ? 'auth-input-error' : ''}`}
                placeholder="Write a constructive response or question..."
                {...register('content')}
              />
              {errors.content && (
                <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircle size={12} />
                  <span>{errors.content.message}</span>
                </div>
              )}
              <div className="fb-composer-footer">
                <button
                  type="submit"
                  disabled={isSubmitting || createCommentMutation.isPending}
                  className="btn btn-primary btn-sm"
                >
                  <Send size={14} />
                  {createCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
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

        {/* Facebook Comments List */}
        <div className="fb-comments-section">
          {commentsLoading ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
              Loading discussion...
            </p>
          ) : comments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
              No comments yet. Be the first to start the discussion!
            </p>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment._id}
                comment={comment}
                postId={post._id}
                currentUser={user}
                isAdmin={isAdmin}
                onDelete={(id) => {
                  setDeleteTarget({ type: 'comment', id });
                  setDeleteModalOpen(true);
                }}
                onUpdate={handleUpdateComment}
                onReplySubmit={onReplySubmit}
                onLikeToggle={handleLikeToggle}
              />
            ))
          )}
        </div>
      </section>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDeleteAction}
        title={deleteTarget?.type === 'post' ? 'Delete Blog Article' : 'Delete Comment'}
        message={
          deleteTarget?.type === 'post'
            ? 'Are you sure you want to delete this article? It will be soft-deleted and can be recovered by an administrator.'
            : 'Are you sure you want to permanently delete this comment?'
        }
        confirmText="Confirm Delete"
        isDanger
        isLoading={deletePostMutation.isPending || deleteCommentMutation.isPending}
      />
    </article>
  );
};

export default PostDetails;
