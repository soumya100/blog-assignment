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
    successToast: 'Article deleted successfully',
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

export function useCreateComment(postId, options = {}) {
  return useApiMutation(
    (commentData) => apiClient.post(`/posts/${postId}/comments`, commentData),
    {
      invalidateKeys: [
        queryKeys.comments.list(postId),
        queryKeys.admin.comments(),
        queryKeys.admin.stats(),
      ],
      successToast: 'Comment posted successfully!',
      ...options,
    }
  );
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
