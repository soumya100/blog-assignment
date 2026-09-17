import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import apiClient, { ApiError } from '../api/client';

/**
 * Centralized, structured Query Key Factory for the entire application.
 * Prevents string typos and enables hierarchical cache invalidation.
 */
export const queryKeys = {
  posts: {
    all: ['posts'],
    lists: () => [...queryKeys.posts.all, 'list'],
    list: (filters) => [...queryKeys.posts.lists(), filters || {}],
    details: () => [...queryKeys.posts.all, 'detail'],
    detail: (idOrSlug) => [...queryKeys.posts.details(), idOrSlug],
  },
  comments: {
    all: ['comments'],
    lists: () => [...queryKeys.comments.all, 'list'],
    list: (postId) => [...queryKeys.comments.lists(), postId],
  },
  admin: {
    all: ['admin'],
    stats: () => [...queryKeys.admin.all, 'stats'],
    users: (filters) => [...queryKeys.admin.all, 'users', filters || {}],
    posts: (filters) => [...queryKeys.admin.all, 'posts', filters || {}],
    comments: (filters) => [...queryKeys.admin.all, 'comments', filters || {}],
    activity: (filters) => [...queryKeys.admin.all, 'activity', filters || {}],
  },
  auth: {
    me: ['auth', 'me'],
  },
};

/**
 * Standardized toast helper with auto-dismissal
 */
export const notify = {
  success: (msg, options = {}) =>
    toast.success(msg, {
      autoClose: options.autoClose || 3500,
      ...options,
    }),
  error: (msg, options = {}) =>
    toast.error(msg, {
      autoClose: options.autoClose || 4000,
      ...options,
    }),
  info: (msg, options = {}) =>
    toast.info(msg, {
      autoClose: options.autoClose || 4000,
      ...options,
    }),
  warning: (msg, options = {}) =>
    toast.warning(msg, {
      autoClose: options.autoClose || 4000,
      ...options,
    }),
};

/**
 * Extract clean user-facing error message from fetch ApiError or any error
 */
export const extractErrorMessage = (err, fallback = 'Operation failed') => {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  // ApiError stores structured data
  if (err instanceof ApiError) {
    return err.data?.error?.message || err.data?.message || err.message || fallback;
  }
  return (
    err.response?.data?.error?.message ||
    err.response?.data?.message ||
    err.response?.data?.error ||
    err.message ||
    fallback
  );
};

/**
 * Highly Scalable Custom Hook for API Queries
 * Wraps TanStack Query `useQuery` with standardized Axios fetching, error handling, and payload unwrapping.
 *
 * @param {Array} queryKey - Unique cache key
 * @param {string|Function} endpointOrFn - API endpoint string (e.g. '/posts') or custom async fetch function
 * @param {Object} options - Options including Axios params, select transform, enabled flag, etc.
 */
export function useApiQuery(queryKey, endpointOrFn, options = {}) {
  const { params, select, enabled = true, ...queryOptions } = options;

  const queryFn =
    typeof endpointOrFn === 'function'
      ? endpointOrFn
      : async () => {
          // Fetch client returns parsed JSON directly (no axios .data wrapper)
          return apiClient.get(endpointOrFn, { params });
        };

  return useQuery({
    queryKey,
    queryFn,
    enabled,
    select: select || ((data) => data),
    ...queryOptions,
  });
}

/**
 * Highly Scalable Custom Hook for API Mutations
 * Wraps TanStack Query `useMutation` with automatic cache invalidation, toast alerts, and lifecycle hooks.
 *
 * @param {Function} mutationFn - Async function performing the mutation (e.g. (data) => apiClient.post('/posts', data))
 * @param {Object} options - Configuration options
 * @param {Array<Array>} options.invalidateKeys - List of query keys to invalidate upon mutation success
 * @param {string|Function} options.successToast - Success toast message or resolver function (data, variables) => string
 * @param {boolean|string|Function} options.errorToast - Whether to show error toast (default true) or custom message
 * @param {Function} options.onSuccess - Additional success callback
 * @param {Function} options.onError - Additional error callback
 * @param {Function} options.onSettled - Additional settled callback
 */
export function useApiMutation(mutationFn, options = {}) {
  const queryClient = useQueryClient();
  const {
    invalidateKeys = [],
    successToast,
    errorToast = true,
    onSuccess,
    onError,
    onSettled,
    ...mutationOptions
  } = options;

  return useMutation({
    mutationFn,
    onSuccess: (data, variables, context) => {
      // Automatic cache invalidation for target keys
      if (Array.isArray(invalidateKeys) && invalidateKeys.length > 0) {
        invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      // Auto-dismissing success toast
      if (successToast) {
        const msg = typeof successToast === 'function' ? successToast(data, variables) : successToast;
        notify.success(msg);
      }

      if (onSuccess) {
        onSuccess(data, variables, context);
      }
    },
    onError: (err, variables, context) => {
      // Auto-dismissing error toast
      if (errorToast) {
        const msg =
          typeof errorToast === 'function'
            ? errorToast(err, variables)
            : typeof errorToast === 'string'
            ? errorToast
            : extractErrorMessage(err);
        notify.error(msg);
      }

      if (onError) {
        onError(err, variables, context);
      }
    },
    onSettled: (data, error, variables, context) => {
      if (onSettled) {
        onSettled(data, error, variables, context);
      }
    },
    ...mutationOptions,
  });
}

export default {
  queryKeys,
  notify,
  extractErrorMessage,
  useApiQuery,
  useApiMutation,
};
