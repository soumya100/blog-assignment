import React, { useState, useMemo } from 'react';
import {
  ThumbsUp,
  MessageCircle,
  Edit3,
  Trash2,
  Send,
  X,
  RotateCcw,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../api/client';

export default function CommentItem({
  comment,
  postId,
  currentUser,
  isAdmin,
  onDelete,
  onUpdate,
  onReplySubmit,
  onLikeToggle,
  onRetry,
  onDiscard,
}) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content || '');
  const [isUpdating, setIsUpdating] = useState(false);

  // Lazy-loaded replies state
  const [extraReplies, setExtraReplies] = useState([]);
  const [repliesCursor, setRepliesCursor] = useState(null);
  const [hasMoreReplies, setHasMoreReplies] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [isRepliesExpanded, setIsRepliesExpanded] = useState(true);

  // Optimistic statuses for this comment node
  const isOptimisticSending =
    comment.status === 'sending' || (comment.isOptimistic && !comment.isFailed);
  const isOptimisticError = comment.status === 'error' || comment.isFailed;

  // Check if current user has liked
  const isLiked =
    currentUser &&
    Array.isArray(comment.likes) &&
    comment.likes.some((id) => (id._id || id).toString() === currentUser._id.toString());

  const isAuthor =
    currentUser &&
    comment.author &&
    (
      (comment.author._id && currentUser._id?.toString() === comment.author._id?.toString()) ||
      currentUser._id?.toString() === comment.author?.toString()
    );
  const canManage = isAuthor || isAdmin;

  // Combine initial nested replies with on-demand loaded replies, preventing duplicates
  const allReplies = useMemo(() => {
    const initial = comment.replies || [];
    if (!extraReplies.length) return initial;
    const seen = new Set(initial.map((r) => (r._id || r.tempId).toString()));
    const appended = extraReplies.filter((r) => !seen.has((r._id || r.tempId).toString()));
    return [...initial, ...appended];
  }, [comment.replies, extraReplies]);

  const handleLikeClick = () => {
    if (isOptimisticSending || isOptimisticError) return;
    if (!currentUser) {
      toast.info('Please sign in to like comments', { autoClose: 3000 });
      return;
    }
    onLikeToggle(comment._id);
  };

  const handleReplyClick = () => {
    if (isOptimisticSending || isOptimisticError) return;
    if (!currentUser) {
      toast.info('Please sign in to reply to comments', { autoClose: 3000 });
      return;
    }
    setShowReplyBox(!showReplyBox);
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    const text = replyText.trim();
    if (!text) return;

    setReplyText('');
    setShowReplyBox(false);
    setIsRepliesExpanded(true);

    try {
      await onReplySubmit({
        parentCommentId: comment._id,
        content: text,
      });
    } catch (_) {
      // Handled via optimistic status
    }
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    setIsUpdating(true);
    try {
      await onUpdate(comment._id, editText.trim());
      setIsEditing(false);
    } catch (_) {
      // Handled by caller toast
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLoadMoreReplies = async () => {
    if (isLoadingReplies) return;
    setIsLoadingReplies(true);
    try {
      const params = { limit: 20 };
      if (repliesCursor) params.after = repliesCursor;
      const res = await apiClient.get(`/comments/${comment._id}/replies`, { params });
      const newItems = res.data || [];
      const pagination = res.pagination || {};

      setExtraReplies((prev) => {
        const seen = new Set(prev.map((r) => r._id.toString()));
        const unique = newItems.filter((r) => !seen.has(r._id.toString()));
        return [...prev, ...unique];
      });

      setHasMoreReplies(Boolean(pagination.hasMore));
      setRepliesCursor(pagination.nextCursor || null);
    } catch (err) {
      toast.error('Failed to load replies');
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h`;
    if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  const authorInitial =
    comment.author?.username?.charAt(0)?.toUpperCase() ||
    comment.author?.name?.charAt(0)?.toUpperCase() ||
    'U';

  const userInitial =
    currentUser?.username?.charAt(0)?.toUpperCase() ||
    currentUser?.name?.charAt(0)?.toUpperCase() ||
    'Y';

  const totalReplyCount = Math.max(allReplies.length, comment.directReplyCount || 0);

  return (
    <div className="fb-comment-item">
      {/* Root Comment Row */}
      <div className="fb-comment-root">
        <div className="fb-avatar" title={comment.author?.username} style={{ overflow: 'hidden' }}>
          {comment.author?.avatar ? (
            <img
              src={comment.author.avatar}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            authorInitial
          )}
        </div>

        <div className="fb-bubble-wrap">
          {/* Rounded Bubble */}
          <div
            className={`fb-bubble ${isOptimisticSending ? 'is-optimistic-sending' : ''} ${
              isOptimisticError ? 'is-optimistic-error' : ''
            }`}
          >
            <div className="fb-bubble-header">
              <span className="fb-author-name">
                {comment.author?.username || 'Anonymous'}
                {comment.author?.role === 'ADMIN' && (
                  <span className="fb-author-role">Staff</span>
                )}
              </span>

              {canManage && !isEditing && !comment.isOptimistic && (
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {isAuthor && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '2px',
                      }}
                      title="Edit"
                      aria-label="Edit comment"
                    >
                      <Edit3 size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(comment._id, isAuthor)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '2px',
                    }}
                    title={isAdmin && !isAuthor ? 'Moderate / Delete (Admin)' : 'Delete'}
                    aria-label="Delete comment"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div style={{ marginTop: '0.4rem' }}>
                <textarea
                  className="fb-composer-input"
                  rows={2}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  style={{ minHeight: '60px', padding: '0.5rem', fontSize: '0.85rem' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    Cancel 
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={isUpdating}
                    className="btn btn-primary btn-sm"
                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                  >
                    {isUpdating ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="fb-comment-text">{comment.content}</div>
            )}

            {/* Floating Like Count Badge */}
            {(comment.likesCount > 0 || (comment.likes && comment.likes.length > 0)) && (
              <div
                className="fb-like-badge"
                onClick={handleLikeClick}
                title={`${comment.likesCount || comment.likes?.length} likes`}
              >
                <span>👍</span>
                <span>{comment.likesCount || comment.likes?.length}</span>
              </div>
            )}
          </div>

          {/* Action Bar / Status / Retry Error Bar */}
          {isOptimisticError ? (
            <div className="fb-optimistic-error-bar">
              <span className="fb-error-label">
                <AlertCircle size={12} />
                Failed to post
              </span>
              <button
                type="button"
                onClick={() =>
                  onRetry?.(
                    comment.retryPayload || {
                      postId,
                      content: comment.content,
                      tempId: comment._id,
                    }
                  )
                }
                className="fb-retry-btn"
                title="Retry posting this comment"
              >
                <RotateCcw size={11} />
                Retry
              </button>
              <button
                type="button"
                onClick={() => onDiscard?.(comment._id, comment.parentComment || null)}
                className="fb-discard-btn"
                title="Discard this failed comment"
              >
                <X size={11} />
                Discard
              </button>
            </div>
          ) : isOptimisticSending ? (
            <div className="fb-meta-bar">
              <span className="fb-optimistic-status fb-status-sending">
                <Loader2 size={11} className="spin" />
                Posting...
              </span>
            </div>
          ) : (
            <div className="fb-meta-bar">
              <button
                type="button"
                onClick={handleLikeClick}
                className={`fb-action-btn fb-like-btn ${isLiked ? 'active' : ''}`}
                title={isLiked ? 'Unlike comment' : 'Like comment'}
              >
                <ThumbsUp size={12} />
                <span>{isLiked ? 'Liked' : 'Like'}</span>
              </button>

              <button
                type="button"
                onClick={handleReplyClick}
                className="fb-action-btn"
                aria-label="Reply to comment"
              >
                <MessageCircle size={12} />
                <span>Reply</span>
              </button>

              <span>{formatDate(comment.createdAt)}</span>

              {totalReplyCount > 0 && (
                <button
                  type="button"
                  onClick={() => setIsRepliesExpanded(!isRepliesExpanded)}
                  className="fb-action-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginLeft: '0.5rem' }}
                >
                  {isRepliesExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  <span>{isRepliesExpanded ? 'Hide replies' : `View ${totalReplyCount} ${totalReplyCount === 1 ? 'reply' : 'replies'}`}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inline Reply Composer */}
      {showReplyBox && (
        <form onSubmit={handleSendReply} className="fb-inline-reply-box">
          <div className="fb-avatar fb-avatar-sm" style={{ overflow: 'hidden' }}>
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              userInitial
            )}
          </div>
          <input
            type="text"
            className="fb-composer-input"
            placeholder={`Reply to ${comment.author?.username || 'comment'}...`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={isSubmittingReply}
            autoFocus
          />
          <button
            type="submit"
            disabled={!replyText.trim() || isSubmittingReply}
            className="btn btn-primary btn-sm"
            style={{ padding: '0.4rem 0.75rem', borderRadius: '16px', fontSize: '0.75rem' }}
            aria-label="Send reply"
          >
            <Send size={12} />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowReplyBox(false);
              setReplyText('');
            }}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.4rem 0.6rem', borderRadius: '16px', fontSize: '0.75rem' }}
            aria-label="Cancel reply"
          >
            <X size={12} />
          </button>
        </form>
      )}

      {/* Recursive Nested Replies List */}
      {isRepliesExpanded && allReplies.length > 0 && (
        <div className="fb-replies-list">
          {allReplies.map((reply) => (
            <CommentItem
              key={reply._id || reply.tempId}
              comment={reply}
              postId={postId}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onDelete={onDelete}
              onUpdate={onUpdate}
              onReplySubmit={onReplySubmit}
              onLikeToggle={onLikeToggle}
              onRetry={onRetry}
              onDiscard={onDiscard}
            />
          ))}

          {hasMoreReplies && (
            <button
              type="button"
              onClick={handleLoadMoreReplies}
              disabled={isLoadingReplies}
              className="btn btn-secondary btn-sm"
              style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
              }}
            >
              {isLoadingReplies ? (
                <>
                  <Loader2 size={12} className="spin" />
                  Loading replies...
                </>
              ) : (
                'Load more replies'
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
