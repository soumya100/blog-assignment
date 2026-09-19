import React, { useState } from 'react';
import { ThumbsUp, MessageCircle, Edit3, Trash2, Send, X, Check, Shield } from 'lucide-react';
import { toast } from 'react-toastify';

export default function CommentItem({
  comment,
  postId,
  currentUser,
  isAdmin,
  onDelete,
  onUpdate,
  onReplySubmit,
  onLikeToggle,
}) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [isUpdating, setIsUpdating] = useState(false);

  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editReplyText, setEditReplyText] = useState('');
  const [isUpdatingReply, setIsUpdatingReply] = useState(false);

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

  const handleLikeClick = () => {
    if (!currentUser) {
      toast.info('Please sign in to like comments', { autoClose: 3000 });
      return;
    }
    onLikeToggle(comment._id);
  };

  const handleReplyClick = () => {
    if (!currentUser) {
      toast.info('Please sign in to reply to comments', { autoClose: 3000 });
      return;
    }
    setShowReplyBox(!showReplyBox);
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setIsSubmittingReply(true);
    try {
      await onReplySubmit({
        parentCommentId: comment._id,
        content: replyText.trim(),
      });
      setReplyText('');
      setShowReplyBox(false);
    } catch (err) {
      // Handled by mutation toast
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    setIsUpdating(true);
    try {
      await onUpdate(comment._id, editText.trim());
      setIsEditing(false);
    } catch (err) {
      // Handled by caller
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartEditReply = (reply) => {
    setEditingReplyId(reply._id);
    setEditReplyText(reply.content);
  };

  const handleCancelEditReply = () => {
    setEditingReplyId(null);
    setEditReplyText('');
  };

  const handleSaveEditReply = async (replyId) => {
    if (!editReplyText.trim()) return;
    setIsUpdatingReply(true);
    try {
      await onUpdate(replyId, editReplyText.trim());
      setEditingReplyId(null);
      setEditReplyText('');
    } catch (err) {
      // Handled by caller
    } finally {
      setIsUpdatingReply(false);
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
    return date.toLocaleDateString();
  };

  const authorInitial =
    comment.author?.username?.charAt(0)?.toUpperCase() ||
    comment.author?.name?.charAt(0)?.toUpperCase() ||
    'U';

  const userInitial =
    currentUser?.username?.charAt(0)?.toUpperCase() ||
    currentUser?.name?.charAt(0)?.toUpperCase() ||
    'Y';

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
          {/* Facebook Rounded Bubble */}
          <div className="fb-bubble">
            <div className="fb-bubble-header">
              <span className="fb-author-name">
                {comment.author?.username || 'Anonymous'}
                {comment.author?.role === 'ADMIN' && (
                  <span className="fb-author-role">Staff</span>
                )}
              </span>

              {canManage && !isEditing && (
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
              <div className="fb-like-badge" onClick={handleLikeClick} title={`${comment.likesCount || comment.likes?.length} likes`}>
                <span>👍</span>
                <span>{comment.likesCount || comment.likes?.length}</span>
              </div>
            )}
          </div>

          {/* Action Bar (Like · Reply · Time) */}
          <div className="fb-meta-bar">
            <button
              type="button"
              onClick={handleLikeClick}
              className={`fb-action-btn fb-like-btn ${isLiked ? 'active' : ''}`}
            >
              <ThumbsUp size={12} />
              <span>{isLiked ? 'Liked' : 'Like'}</span>
            </button>

            <button
              type="button"
              onClick={handleReplyClick}
              className="fb-action-btn"
            >
              <MessageCircle size={12} />
              <span>Reply</span>
            </button>

            <span>{formatDate(comment.createdAt)}</span>
          </div>
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
            className="fb-inline-reply-input"
            placeholder={`Reply to @${comment.author?.username || 'user'}...`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            disabled={isSubmittingReply || !replyText.trim()}
            className="btn btn-primary btn-sm"
            style={{ padding: '0.4rem 0.75rem', borderRadius: '16px', fontSize: '0.75rem' }}
          >
            <Send size={12} />
          </button>
          <button
            type="button"
            onClick={() => setShowReplyBox(false)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.4rem 0.6rem', borderRadius: '16px', fontSize: '0.75rem' }}
          >
            <X size={12} />
          </button>
        </form>
      )}

      {/* Nested Replies List */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="fb-replies-list">
          {comment.replies.map((reply) => {
            const isReplyAuthor =
              currentUser &&
              reply.author &&
              (
                (reply.author._id && currentUser._id?.toString() === reply.author._id?.toString()) ||
                currentUser._id?.toString() === reply.author?.toString()
              );
            const canManageReply = isReplyAuthor || isAdmin;
            const isEditingThisReply = editingReplyId === reply._id;

            const isReplyLiked =
              currentUser &&
              Array.isArray(reply.likes) &&
              reply.likes.some((id) => (id._id || id).toString() === currentUser._id.toString());

            const replyAuthorInitial =
              reply.author?.username?.charAt(0)?.toUpperCase() ||
              reply.author?.name?.charAt(0)?.toUpperCase() ||
              'U';

            return (
              <div key={reply._id} className="fb-comment-root">
                <div className="fb-avatar fb-avatar-sm" title={reply.author?.username} style={{ overflow: 'hidden' }}>
                  {reply.author?.avatar ? (
                    <img
                      src={reply.author.avatar}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    replyAuthorInitial
                  )}
                </div>

                <div className="fb-bubble-wrap">
                  <div className="fb-bubble" style={{ padding: '0.5rem 0.85rem' }}>
                    <div className="fb-bubble-header">
                      <span className="fb-author-name" style={{ fontSize: '0.8rem' }}>
                        {reply.author?.username || 'Anonymous'}
                        {reply.author?.role === 'ADMIN' && (
                          <span className="fb-author-role">Staff</span>
                        )}
                      </span>

                      {canManageReply && !isEditingThisReply && (
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {isReplyAuthor && (
                            <button
                              type="button"
                              onClick={() => handleStartEditReply(reply)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '2px',
                              }}
                              title="Edit Reply"
                            >
                              <Edit3 size={11} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDelete(reply._id, isReplyAuthor)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                            title={isAdmin && !isReplyAuthor ? 'Moderate / Delete (Admin)' : 'Delete Reply'}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditingThisReply ? (
                      <div style={{ marginTop: '0.35rem' }}>
                        <textarea
                          className="fb-composer-input"
                          rows={2}
                          value={editReplyText}
                          onChange={(e) => setEditReplyText(e.target.value)}
                          style={{ minHeight: '50px', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                          autoFocus
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={handleCancelEditReply}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditReply(reply._id)}
                            disabled={isUpdatingReply}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '0.15rem 0.55rem', fontSize: '0.7rem' }}
                          >
                            {isUpdatingReply ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="fb-comment-text" style={{ fontSize: '0.825rem' }}>
                        {reply.content}
                      </div>
                    )}

                    {/* Floating Like Count Badge for Reply */}
                    {(reply.likesCount > 0 || (reply.likes && reply.likes.length > 0)) && (
                      <div
                        className="fb-like-badge"
                        onClick={() => {
                          if (!currentUser) {
                            toast.info('Please sign in to like replies', { autoClose: 3000 });
                            return;
                          }
                          onLikeToggle(reply._id);
                        }}
                        style={{ bottom: '-7px', right: '-6px', padding: '1px 5px', fontSize: '0.65rem' }}
                      >
                        <span>👍</span>
                        <span>{reply.likesCount || reply.likes?.length}</span>
                      </div>
                    )}
                  </div>

                  {/* Reply Action Bar */}
                  <div className="fb-meta-bar">
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentUser) {
                          toast.info('Please sign in to like replies', { autoClose: 3000 });
                          return;
                        }
                        onLikeToggle(reply._id);
                      }}
                      className={`fb-action-btn fb-like-btn ${isReplyLiked ? 'active' : ''}`}
                    >
                      <ThumbsUp size={11} />
                      <span>{isReplyLiked ? 'Liked' : 'Like'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleReplyClick}
                      className="fb-action-btn"
                    >
                      <span>Reply</span>
                    </button>

                    <span>{formatDate(reply.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
