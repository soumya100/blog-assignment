/**
 * Custom Fetch-based API Client
 * 
 * A highly customizable and scalable HTTP client built on native JS `fetch`.
 * Features:
 *   - Automatic JSON request/response handling
 *   - Bearer token injection from localStorage
 *   - Silent 401 token refresh with request queuing
 *   - Custom error class for structured error handling
 *   - Configurable base URL, headers, and credentials
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

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
 * Execute a fetch request with automatic auth headers, JSON handling, and token refresh.
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

  const token = localStorage.getItem('accessToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Build fetch config
  const fetchConfig = {
    method,
    headers,
    credentials: 'include', // Crucial for HttpOnly refresh token cookie
  };

  if (body && method !== 'GET' && method !== 'HEAD') {
    fetchConfig.body = JSON.stringify(body);
  }

  // Execute request
  const response = await fetch(url, fetchConfig);

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
      endpoint.includes('/auth/refresh');

    if (!isAuthRoute) {
      if (isRefreshing) {
        // Queue this request until the refresh resolves
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          return request(endpoint, {
            ...options,
            _retry: true,
            headers: { ...customHeaders, Authorization: `Bearer ${newToken}` },
          });
        });
      }

      isRefreshing = true;

      try {
        const storedRefreshToken = localStorage.getItem('refreshToken');
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        });

        if (!refreshResponse.ok) {
          throw new Error('Refresh failed');
        }

        const refreshData = await refreshResponse.json();
        const newAccessToken = refreshData.data.accessToken;
        const newRefreshToken = refreshData.data.refreshToken;

        localStorage.setItem('accessToken', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        processQueue(null, newAccessToken);
        isRefreshing = false;

        // Retry original request with new token
        return request(endpoint, {
          ...options,
          _retry: true,
          headers: { ...customHeaders, Authorization: `Bearer ${newAccessToken}` },
        });
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;

        // Revoke local tokens on failure
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
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

export { API_BASE_URL };
export default apiClient;
