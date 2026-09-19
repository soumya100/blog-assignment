import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { queryKeys, useApiQuery, useApiMutation } from './useApi';

// ==========================================
// Blog Posts Hooks
// ==========================================

export function usePosts(params = {}) {
  return useApiQuery(queryKeys.posts.list(params), '/posts', {
    params,
    select: (res) => ({
      posts: res.data || [],
      pagination: res.pagination || { page: 1, totalPages: 1 },
    }),
  });
}

export function usePost(idOrSlug) {
  return useApiQuery(queryKeys.posts.detail(idOrSlug), `/posts/${idOrSlug}`, {
    enabled: Boolean(idOrSlug),
    select: (res) => res.data,
  });
}

export function useCreatePost(options = {}) {
  return useApiMutation((newPost) => apiClient.post('/posts', newPost), {
    invalidateKeys: [queryKeys.posts.all, queryKeys.admin.posts(), queryKeys.admin.stats()],
    successToast: 'Article published successfully!',
    ...options,
  });
}

export function useUpdatePost(options = {}) {
  return useApiMutation(
    ({ id, ...patchData }) => apiClient.patch(`/posts/${id}`, patchData),
    {
      invalidateKeys: [queryKeys.posts.all, queryKeys.admin.posts()],
      successToast: 'Article updated successfully!',
      ...options,
    }
  );
}

export function useDeletePost(options = {}) {
  return useApiMutation((postId) => apiClient.delete(`/posts/${postId}`), {
    invalidateKeys: [queryKeys.posts.all, queryKeys.admin.posts(), queryKeys.admin.stats()],
    successToast: 'Article moved to trash',
    ...options,
  });
}

export function useRestorePost(options = {}) {
  return useApiMutation((postId) => apiClient.post(`/posts/${postId}/restore`), {
    invalidateKeys: [queryKeys.posts.all, queryKeys.admin.posts(), queryKeys.admin.stats()],
    successToast: 'Article restored successfully',
    ...options,
  });
}

// ==========================================
// Comments Hooks
// ==========================================

export function useComments(postId) {
  return useApiQuery(
    queryKeys.comments.list(postId),
    `/posts/${postId}/comments`,
    {
      enabled: Boolean(postId),
      select: (res) => res.data || [],
    }
  );
}

export function useCreateComment(defaultPostId, options = {}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useApiMutation(
    (payload) => {
      const targetPostId = payload?.postId || defaultPostId;
      const body =
        typeof payload === 'string'
          ? { content: payload }
          : { content: payload?.content, parentCommentId: payload?.parentCommentId };
      return apiClient.post(`/posts/${targetPostId}/comments`, body);
    },
    {
      onMutate: async (payload) => {
        const targetPostId = payload?.postId || defaultPostId;
        if (!targetPostId || !user) return;

        const queryKey = queryKeys.comments.list(targetPostId);
        await queryClient.cancelQueries({ queryKey });

        const previousData = queryClient.getQueryData(queryKey);

        const content = typeof payload === 'string' ? payload : payload?.content;
        const parentCommentId = payload?.parentCommentId;
        const tempId =
          payload?.tempId || `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        const optimisticItem = {
          _id: tempId,
          tempId,
          content,
          post: targetPostId,
          parentComment: parentCommentId || null,
          author: {
            _id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
          },
          likes: [],
          likesCount: 0,
          replies: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isOptimistic: true,
          status: 'sending',
          retryPayload: {
            postId: targetPostId,
            content,
            parentCommentId,
            tempId,
          },
        };

        queryClient.setQueryData(queryKey, (old) => {
          if (!old) {
            return {
              success: true,
              data: [optimisticItem],
              pagination: { total: 1, page: 1, limit: 50 },
            };
          }

          const isArray = Array.isArray(old);
          const commentsList = isArray ? old : (old.data || []);

          let updatedComments;
          if (!parentCommentId) {
            const existingIndex = commentsList.findIndex((c) => c._id === tempId);
            if (existingIndex !== -1) {
              updatedComments = commentsList.map((c) =>
                c._id === tempId
                  ? { ...c, status: 'sending', isFailed: false, errorMessage: null }
                  : c
              );
            } else {
              updatedComments = [optimisticItem, ...commentsList];
            }
          } else {
            updatedComments = commentsList.map((c) => {
              if (c._id === parentCommentId) {
                const replies = c.replies || [];
                const existingReplyIndex = replies.findIndex((r) => r._id === tempId);
                let updatedReplies;
                if (existingReplyIndex !== -1) {
                  updatedReplies = replies.map((r) =>
                    r._id === tempId
                      ? { ...r, status: 'sending', isFailed: false, errorMessage: null }
                      : r
                  );
                } else {
                  updatedReplies = [...replies, optimisticItem];
                }
                return {
                  ...c,
                  replies: updatedReplies,
                };
              }
              return c;
            });
          }

          return isArray ? updatedComments : { ...old, data: updatedComments };
        });

        return { previousData, queryKey, tempId, parentCommentId };
      },
      onError: (err, payload, context) => {
        if (context?.queryKey && context?.tempId) {
          queryClient.setQueryData(context.queryKey, (old) => {
            if (!old) return old;
            const isArray = Array.isArray(old);
            const commentsList = isArray ? old : (old.data || []);

            const markError = (item) => ({
              ...item,
              status: 'error',
              isFailed: true,
              errorMessage: err?.message || 'Failed to post',
            });

            let updatedComments;
            if (!context.parentCommentId) {
              updatedComments = commentsList.map((c) =>
                c._id === context.tempId ? markError(c) : c
              );
            } else {
              updatedComments = commentsList.map((c) => {
                if (c._id === context.parentCommentId && c.replies) {
                  return {
                    ...c,
                    replies: c.replies.map((r) =>
                      r._id === context.tempId ? markError(r) : r
                    ),
                  };
                }
                return c;
              });
            }

            return isArray ? updatedComments : { ...old, data: updatedComments };
          });
        }
      },
      onSettled: (data, error, payload, context) => {
        if (!error && context?.queryKey) {
          queryClient.invalidateQueries({ queryKey: context.queryKey });
          queryClient.invalidateQueries({ queryKey: queryKeys.admin.comments() });
          queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() });
        }
      },
      successToast: 'Comment posted successfully!',
      ...options,
    }
  );
}

export function useLikeComment(defaultPostId, options = {}) {
  const actualPostId = typeof defaultPostId === 'string' ? defaultPostId : undefined;
  const actualOptions =
    typeof defaultPostId === 'object' && defaultPostId !== null ? defaultPostId : options;

  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useApiMutation(
    ({ commentId }) => apiClient.post(`/comments/${commentId}/like`),
    {
      onMutate: async (variables) => {
        const targetPostId = variables.postId || actualPostId;
        if (!targetPostId || !user) return;

        const queryKey = queryKeys.comments.list(targetPostId);
        await queryClient.cancelQueries({ queryKey });

        const previousData = queryClient.getQueryData(queryKey);

        const toggleItemLike = (item) => {
          const currentUserId = user._id?.toString();
          const likes = Array.isArray(item.likes) ? [...item.likes] : [];
          const userIndex = likes.findIndex((id) => (id._id || id).toString() === currentUserId);
          const hasLiked = userIndex !== -1;

          let newLikes;
          let newLikesCount;

          if (hasLiked) {
            newLikes = likes.filter((id) => (id._id || id).toString() !== currentUserId);
            newLikesCount = Math.max(
              0,
              (item.likesCount !== undefined ? item.likesCount : likes.length) - 1
            );
          } else {
            newLikes = [...likes, currentUserId];
            newLikesCount = (item.likesCount !== undefined ? item.likesCount : likes.length) + 1;
          }

          return {
            ...item,
            likes: newLikes,
            likesCount: newLikesCount,
          };
        };

        queryClient.setQueryData(queryKey, (old) => {
          if (!old) return old;
          const isArray = Array.isArray(old);
          const commentsList = isArray ? old : (old.data || []);

          const updatedComments = commentsList.map((c) => {
            if (c._id === variables.commentId) {
              return toggleItemLike(c);
            }
            if (c.replies && Array.isArray(c.replies)) {
              const replyIndex = c.replies.findIndex((r) => r._id === variables.commentId);
              if (replyIndex !== -1) {
                const updatedReplies = [...c.replies];
                updatedReplies[replyIndex] = toggleItemLike(c.replies[replyIndex]);
                return {
                  ...c,
                  replies: updatedReplies,
                };
              }
            }
            return c;
          });

          return isArray ? updatedComments : { ...old, data: updatedComments };
        });

        return { previousData, queryKey };
      },
      onError: (err, variables, context) => {
        if (context?.queryKey && context?.previousData) {
          queryClient.setQueryData(context.queryKey, context.previousData);
        }
      },
      onSettled: (data, error, variables, context) => {
        if (context?.queryKey) {
          queryClient.invalidateQueries({ queryKey: context.queryKey });
        }
      },
      ...actualOptions,
    }
  );
}

export function useDiscardOptimisticComment(postId) {
  const queryClient = useQueryClient();
  return (tempId, parentCommentId = null) => {
    if (!postId) return;
    const queryKey = queryKeys.comments.list(postId);
    queryClient.setQueryData(queryKey, (old) => {
      if (!old) return old;
      const isArray = Array.isArray(old);
      const commentsList = isArray ? old : (old.data || []);

      let updatedComments;
      if (!parentCommentId) {
        updatedComments = commentsList.filter((c) => c._id !== tempId);
      } else {
        updatedComments = commentsList.map((c) => {
          if (c._id === parentCommentId && c.replies) {
            return {
              ...c,
              replies: c.replies.filter((r) => r._id !== tempId),
            };
          }
          return c;
        });
      }

      return isArray ? updatedComments : { ...old, data: updatedComments };
    });
  };
}

export function useDeleteComment(postId, options = {}) {
  return useApiMutation((commentId) => apiClient.delete(`/comments/${commentId}`), {
    invalidateKeys: [
      queryKeys.comments.all,
      queryKeys.admin.comments(),
      queryKeys.admin.stats(),
    ],
    successToast: 'Comment deleted successfully',
    ...options,
  });
}

// ==========================================
// Password Management Hooks
// ==========================================

export function useForgotPassword(options = {}) {
  return useApiMutation(
    (data) => apiClient.post('/auth/forgot-password', data),
    {
      ...options,
    }
  );
}

export function useVerifyOtp(options = {}) {
  return useApiMutation(
    (data) => apiClient.post('/auth/verify-otp', data),
    {
      ...options,
    }
  );
}

export function useResetPassword(options = {}) {
  return useApiMutation(
    ({ token, password }) => apiClient.post(`/auth/reset-password/${token}`, { password }),
    {
      ...options,
    }
  );
}

export function useUpdateProfile(options = {}) {
  return useApiMutation(
    (profileData) => apiClient.patch('/auth/profile', profileData),
    {
      successToast: 'Profile updated successfully!',
      ...options,
    }
  );
}

// ==========================================
// Admin Governance Hooks
// ==========================================

export function useAdminStats() {
  return useApiQuery(queryKeys.admin.stats(), '/admin/stats', {
    select: (res) => res.data,
  });
}

export function useAdminUsers(params = {}) {
  return useApiQuery(queryKeys.admin.users(params), '/admin/users', {
    params,
    select: (res) => ({
      users: res.data || [],
      pagination: res.pagination || { page: 1, totalPages: 1 },
    }),
  });
}

export function useUpdateUserRole(options = {}) {
  return useApiMutation(
    ({ userId, role }) => apiClient.patch(`/admin/users/${userId}/role`, { role }),
    {
      invalidateKeys: [queryKeys.admin.users(), queryKeys.admin.stats()],
      successToast: 'User permissions updated successfully',
      ...options,
    }
  );
}

export function useUpdateUserStatus(options = {}) {
  return useApiMutation(
    ({ userId, status }) => apiClient.patch(`/admin/users/${userId}/status`, { status }),
    {
      invalidateKeys: [queryKeys.admin.users(), queryKeys.admin.stats()],
      successToast: (_, { status }) => `User account status changed to ${status}`,
      ...options,
    }
  );
}

export function useAdminPosts(params = {}) {
  return useApiQuery(
    queryKeys.admin.posts(params),
    '/posts',
    {
      params: { ...params, includeDeleted: true },
      select: (res) => ({
        posts: res.data || [],
        pagination: res.pagination || { page: 1, totalPages: 1 },
      }),
    }
  );
}

export function useAdminComments(params = {}) {
  return useApiQuery(queryKeys.admin.comments(params), '/admin/comments', {
    params,
    select: (res) => ({
      comments: res.data || [],
      pagination: res.pagination || { page: 1, totalPages: 1 },
    }),
  });
}

export function useAdminActivity(params = {}) {
  return useApiQuery(queryKeys.admin.activity(params), '/admin/activity', {
    params,
    select: (res) => ({
      logs: res.data || [],
      pagination: res.pagination || { page: 1, totalPages: 1 },
    }),
  });
}
