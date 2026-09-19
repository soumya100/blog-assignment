import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CommentItem from '../components/CommentItem';

describe('CommentItem Optimistic Updates and Retry UI', () => {
  const mockCurrentUser = {
    _id: 'user-123',
    username: 'alex_dev',
    email: 'alex@example.com',
    role: 'USER',
  };

  const sampleComment = {
    _id: 'comment-1',
    content: 'This is a standard persisted comment',
    author: {
      _id: 'user-456',
      username: 'sarah_arch',
      role: 'USER',
    },
    likes: [],
    likesCount: 0,
    replies: [],
    createdAt: new Date().toISOString(),
  };

  test('renders standard comment with Like, Reply buttons and content', () => {
    const handleLikeToggle = vi.fn();
    render(
      <CommentItem
        comment={sampleComment}
        postId="post-1"
        currentUser={mockCurrentUser}
        onLikeToggle={handleLikeToggle}
      />
    );

    expect(screen.getByText('This is a standard persisted comment')).toBeInTheDocument();
    expect(screen.getByText('sarah_arch')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /like/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reply/i })).toBeInTheDocument();

    // Click like
    fireEvent.click(screen.getByRole('button', { name: /like/i }));
    expect(handleLikeToggle).toHaveBeenCalledWith('comment-1');
  });

  test('renders optimistic sending state with Posting indicator', () => {
    const optimisticSendingComment = {
      ...sampleComment,
      _id: 'temp-123',
      status: 'sending',
      isOptimistic: true,
      content: 'Optimistic comment in flight...',
    };

    render(
      <CommentItem
        comment={optimisticSendingComment}
        postId="post-1"
        currentUser={mockCurrentUser}
      />
    );

    expect(screen.getByText('Optimistic comment in flight...')).toBeInTheDocument();
    expect(screen.getByText(/posting\.\.\./i)).toBeInTheDocument();
    // In sending state, standard like button should not be clickable
    expect(screen.queryByRole('button', { name: /^like$/i })).not.toBeInTheDocument();
  });

  test('renders optimistic error state with Retry and Discard buttons and fires handlers', () => {
    const onRetry = vi.fn();
    const onDiscard = vi.fn();

    const optimisticFailedComment = {
      ...sampleComment,
      _id: 'temp-failed-1',
      status: 'error',
      isFailed: true,
      content: 'Network dropped while posting',
      retryPayload: {
        postId: 'post-1',
        content: 'Network dropped while posting',
        tempId: 'temp-failed-1',
      },
    };

    render(
      <CommentItem
        comment={optimisticFailedComment}
        postId="post-1"
        currentUser={mockCurrentUser}
        onRetry={onRetry}
        onDiscard={onDiscard}
      />
    );

    expect(screen.getByText('Network dropped while posting')).toBeInTheDocument();
    expect(screen.getByText(/failed to post/i)).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    const discardBtn = screen.getByRole('button', { name: /discard/i });
    expect(retryBtn).toBeInTheDocument();
    expect(discardBtn).toBeInTheDocument();

    // Test retry click
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledWith({
      postId: 'post-1',
      content: 'Network dropped while posting',
      tempId: 'temp-failed-1',
    });

    // Test discard click
    fireEvent.click(discardBtn);
    expect(onDiscard).toHaveBeenCalledWith('temp-failed-1', null);
  });

  test('renders nested reply with error state and handles reply retry and discard', () => {
    const onRetry = vi.fn();
    const onDiscard = vi.fn();

    const commentWithFailedReply = {
      ...sampleComment,
      replies: [
        {
          _id: 'temp-reply-failed-2',
          content: 'My reply failed to deliver',
          parentComment: 'comment-1',
          author: mockCurrentUser,
          status: 'error',
          isFailed: true,
          retryPayload: {
            postId: 'post-1',
            parentCommentId: 'comment-1',
            content: 'My reply failed to deliver',
            tempId: 'temp-reply-failed-2',
          },
        },
      ],
    };

    render(
      <CommentItem
        comment={commentWithFailedReply}
        postId="post-1"
        currentUser={mockCurrentUser}
        onRetry={onRetry}
        onDiscard={onDiscard}
      />
    );

    expect(screen.getByText('My reply failed to deliver')).toBeInTheDocument();
    const retryButtons = screen.getAllByRole('button', { name: /retry/i });
    expect(retryButtons.length).toBe(1);

    fireEvent.click(retryButtons[0]);
    expect(onRetry).toHaveBeenCalledWith({
      postId: 'post-1',
      parentCommentId: 'comment-1',
      content: 'My reply failed to deliver',
      tempId: 'temp-reply-failed-2',
    });

    const discardButtons = screen.getAllByRole('button', { name: /discard/i });
    fireEvent.click(discardButtons[0]);
    expect(onDiscard).toHaveBeenCalledWith('temp-reply-failed-2', 'comment-1');
  });
});
