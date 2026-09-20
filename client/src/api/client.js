/**
 * Custom Fetch-based API Client
 * 
 * A highly customizable and scalable HTTP client built on native JS `fetch`.
 * Features:
 *   - Automatic JSON request/response handling
 *   - HttpOnly cookie authentication (credentials: 'include')
 *   - In-memory access token support (zero localStorage)
 *   - Silent 401 token refresh with request queuing
 *   - Custom error class for structured error handling
 *   - Offline token revocation queue for server-unavailability resilience
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:5000/api/v1');

// ─── Custom API Error ───────────────────────────────────────
export class ApiError extends Error {
  constructor(message, status, data, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.code = code;
    // Mimic axios-style response shape for backwards compatibility
    this.response = {
      status,
      data: data || { error: { message }, message },
    };
  }
}

// ─── Pure In-Memory Token Storage (Zero localStorage / sessionStorage) ───
let inMemoryAccessToken = null;

export const setInMemoryToken = (token) => {
  inMemoryAccessToken = token || null;
};

export const getInMemoryToken = () => {
  return inMemoryAccessToken;
};

// Maintained for backward compatibility; refresh token is server-managed HttpOnly cookie
export const setRefreshToken = () => {};
export const getRefreshToken = () => null;

// ─── Offline Pending Revocation Queue ─────────────────────────
// Resiliency for when server is unavailable during logout/revocation.
// Automatically flushed when server connectivity returns (online event).
let pendingRevocations = [];

export const queuePendingRevocation = () => {
  pendingRevocations.push({ timestamp: Date.now() });
};

export const flushPendingRevocations = async () => {
  if (pendingRevocations.length === 0) return;
  try {
    await fetch(`${API_BASE_URL}/auth/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    pendingRevocations = [];
  } catch (err) {
    // Server still unavailable; will be retried when connectivity returns
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushPendingRevocations();
  });
}

// ─── Token Refresh Queue ────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ─── Core Request Function ──────────────────────────────────

/**
 * Execute a fetch request with automatic credentials, JSON handling, and token refresh.
 *
 * @param {string} endpoint - API endpoint (e.g. '/posts', '/auth/login')
 * @param {Object} options - Request options
 * @param {string} [options.method='GET'] - HTTP method
 * @param {Object} [options.body] - Request body (auto-serialized to JSON)
 * @param {Object} [options.params] - URL query parameters
 * @param {Object} [options.headers] - Additional headers
 * @param {boolean} [options._retry] - Internal flag to prevent infinite refresh loops
 * @returns {Promise<Object>} Parsed JSON response
 */
async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    params,
    headers: customHeaders = {},
    _retry = false,
  } = options;

  // Build URL with query parameters
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (inMemoryAccessToken) {
    headers['Authorization'] = `Bearer ${inMemoryAccessToken}`;
  }

  // Build fetch config with credentials: 'include' for HttpOnly cookies
  const fetchConfig = {
    method,
    headers,
    credentials: 'include',
  };

  if (body && method !== 'GET' && method !== 'HEAD') {
    fetchConfig.body = JSON.stringify(body);
  }

  // Execute request
  let response;
  try {
    response = await fetch(url, fetchConfig);
  } catch (networkErr) {
    throw new ApiError(
      networkErr.message || 'Network error: Server is currently unavailable',
      0,
      null,
      'SERVER_UNAVAILABLE'
    );
  }

  // Handle non-JSON responses (e.g. 204 No Content)
  if (response.status === 204) {
    return { data: null };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new ApiError('Server returned an invalid response', response.status, null);
    }
    return { data: null };
  }

  // ─── 401 Silent Token Refresh ───────────────────────────
  if (response.status === 401 && !_retry) {
    const isAuthRoute =
      endpoint.includes('/auth/login') ||
      endpoint.includes('/auth/register') ||
      endpoint.includes('/auth/refresh') ||
      endpoint.includes('/auth/oauth/session') ||
      endpoint.includes('/auth/oauth/dev');

    if (!isAuthRoute) {
      if (isRefreshing) {
        // Queue this request until the refresh resolves
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          const retryHeaders = { ...customHeaders };
          if (newToken) retryHeaders['Authorization'] = `Bearer ${newToken}`;
          return request(endpoint, {
            ...options,
            _retry: true,
            headers: retryHeaders,
          });
        });
      }

      isRefreshing = true;

      try {
        // Credentials: 'include' automatically sends the HttpOnly refreshToken cookie
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!refreshResponse.ok) {
          throw new Error('Refresh failed');
        }

        const refreshData = await refreshResponse.json();
        const newAccessToken = refreshData?.data?.accessToken || null;
        if (newAccessToken) {
          setInMemoryToken(newAccessToken);
        }

        processQueue(null, newAccessToken);
        isRefreshing = false;

        // Retry original request
        const retryHeaders = { ...customHeaders };
        if (newAccessToken) retryHeaders['Authorization'] = `Bearer ${newAccessToken}`;

        return request(endpoint, {
          ...options,
          _retry: true,
          headers: retryHeaders,
        });
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;
        setInMemoryToken(null);

        window.dispatchEvent(new CustomEvent('auth:expired'));

        throw new ApiError('Session expired. Please log in again.', 401, null, 'SESSION_EXPIRED');
      }
    }
  }

  // ─── Error Handling ─────────────────────────────────────
  if (!response.ok) {
    const message =
      data?.error?.message || data?.message || data?.error || `Request failed with status ${response.status}`;
    const code = data?.error?.code || data?.code;
    throw new ApiError(message, response.status, data, code);
  }

  return data;
}

// ─── Convenience Methods ────────────────────────────────────

const apiClient = {
  get: (endpoint, config = {}) =>
    request(endpoint, { method: 'GET', params: config.params, headers: config.headers }),

  post: (endpoint, body, config = {}) =>
    request(endpoint, { method: 'POST', body, headers: config.headers }),

  patch: (endpoint, body, config = {}) =>
    request(endpoint, { method: 'PATCH', body, headers: config.headers }),

  put: (endpoint, body, config = {}) =>
    request(endpoint, { method: 'PUT', body, headers: config.headers }),

  delete: (endpoint, config = {}) =>
    request(endpoint, { method: 'DELETE', body: config.body || config.data, headers: config.headers }),
};

export default apiClient;
