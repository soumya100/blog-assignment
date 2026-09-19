import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient, { setInMemoryToken, setRefreshToken, queuePendingRevocation } from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Initialize state from storage so page reload is instant and never flickers logout
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('devlog_user');
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('devlog_token') || null;
    }
    return null;
  });

  const [loading, setLoading] = useState(false);

  const saveAuthSession = (newUser, newAccessToken, newRefreshToken) => {
    setUser(newUser);
    setToken(newAccessToken || null);
    if (newAccessToken) {
      setInMemoryToken(newAccessToken);
    }
    if (newRefreshToken) {
      setRefreshToken(newRefreshToken);
    }
    if (typeof window !== 'undefined') {
      if (newUser) {
        localStorage.setItem('devlog_user', JSON.stringify(newUser));
      } else {
        localStorage.removeItem('devlog_user');
      }
    }
  };

  const clearAuthSession = useCallback(() => {
    setUser(null);
    setToken(null);
    setInMemoryToken(null);
    setRefreshToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('devlog_user');
    }
  }, []);

  // Verify auth session in background on startup
  useEffect(() => {
    const verifySession = async () => {
      // Only verify with server if user or token exists
      const hasStoredToken = typeof window !== 'undefined' && localStorage.getItem('devlog_token');
      if (!hasStoredToken) {
        return;
      }

      try {
        const res = await apiClient.get('/auth/me');
        const currentUser = res.data?.user || res.data;
        const currentToken = res.data?.accessToken || localStorage.getItem('devlog_token');
        saveAuthSession(currentUser, currentToken);
      } catch (err) {
        // Only clear if server explicitly rejects with 401 session expired
        if (err.status === 401 || err.code === 'SESSION_EXPIRED') {
          clearAuthSession();
        }
      }
    };

    verifySession();

    // Listen for custom expired event from fetch interceptor
    const handleAuthExpired = () => {
      clearAuthSession();
    };
    window.addEventListener('auth:expired', handleAuthExpired);

    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [clearAuthSession]);

  const login = async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { user: loggedInUser, accessToken, refreshToken } = res.data;
    saveAuthSession(loggedInUser, accessToken, refreshToken);
    return loggedInUser;
  };

  const register = async (username, email, password) => {
    const res = await apiClient.post('/auth/register', { username, email, password });
    const { user: registeredUser, accessToken, refreshToken } = res.data;
    saveAuthSession(registeredUser, accessToken, refreshToken);
    return registeredUser;
  };

  const logout = async () => {
    try {
      // HttpOnly cookie sent automatically; backend revokes refresh token & clears cookies
      await apiClient.post('/auth/logout');
    } catch (e) {
      // If server is unreachable/offline, queue revocation to flush upon connectivity return
      queuePendingRevocation();
    } finally {
      clearAuthSession();
    }
  };

  const oauthDevLogin = async (provider, email, name) => {
    const res = await apiClient.post('/auth/oauth/dev', {
      provider,
      email,
      name,
    });
    const { user: oauthUser, accessToken } = res.data;
    saveAuthSession(oauthUser, accessToken);
    return oauthUser;
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        isAdmin,
        updateUser: (updatedUser) =>
          setUser((prev) => (prev ? { ...prev, ...updatedUser } : updatedUser)),
        login,
        register,
        logout,
        oauthDevLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
