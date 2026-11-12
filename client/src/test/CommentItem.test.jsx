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

  test('renders multi-level nested replies and correctly targets nested parent on reply', () => {
    const onReplySubmit = vi.fn();

    const deeplyNestedComment = {
      _id: 'root-1',
      content: 'Root level discussion',
      author: { _id: 'user-1', username: 'alice', role: 'USER' },
      likes: [],
      likesCount: 0,
      replies: [
        {
          _id: 'level-2',
          content: 'Level 2 nested reply',
          parentComment: 'root-1',
          author: { _id: 'user-2', username: 'bob', role: 'USER' },
          likes: [],
          likesCount: 0,
          replies: [
            {
              _id: 'level-3',
              content: 'Level 3 deeply nested reply',
              parentComment: 'level-2',
              author: { _id: 'user-3', username: 'charlie', role: 'USER' },
              likes: [],
              likesCount: 0,
              replies: [],
              createdAt: new Date().toISOString(),
            },
          ],
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    };

    render(
      <CommentItem
        comment={deeplyNestedComment}
        postId="post-1"
        currentUser={mockCurrentUser}
        onReplySubmit={onReplySubmit}
      />
    );

    // Verify all 3 levels are rendered
    expect(screen.getByText('Root level discussion')).toBeInTheDocument();
    expect(screen.getByText('Level 2 nested reply')).toBeInTheDocument();
    expect(screen.getByText('Level 3 deeply nested reply')).toBeInTheDocument();

    // Click reply on level 3
    const replyButtons = screen.getAllByRole('button', { name: /reply/i });
    expect(replyButtons.length).toBe(3); // root, level-2, level-3

    // Click the reply button for level-3 (the last one)
    fireEvent.click(replyButtons[2]);

    // Find input for the open composer
    const input = screen.getByPlaceholderText(/reply to charlie\.\.\./i);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Level 4 response' } });

    // Submit reply
    const submitBtn = screen.getByRole('button', { name: /send reply/i });
    fireEvent.click(submitBtn);

    expect(onReplySubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        parentCommentId: 'level-3',
        content: 'Level 4 response',
      })
    );
  });
});
