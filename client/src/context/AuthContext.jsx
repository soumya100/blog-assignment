import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient, { setInMemoryToken, queuePendingRevocation } from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Pure in-memory session state - zero localStorage / sessionStorage persistence
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // Begins in INITIALIZING state to check HttpOnly cookie with server

  const saveAuthSession = useCallback((newUser, newAccessToken) => {
    setUser(newUser || null);
    setToken(newAccessToken || null);
    if (newAccessToken) {
      setInMemoryToken(newAccessToken);
    } else {
      setInMemoryToken(null);
    }
  }, []);

  const clearAuthSession = useCallback(() => {
    setUser(null);
    setToken(null);
    setInMemoryToken(null);
  }, []);

  // Restore session from server via HttpOnly cookie on application startup & page reloads
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        // credentials: 'include' automatically sends the HttpOnly accessToken/refreshToken cookies
        const res = await apiClient.get('/auth/me');
        const currentUser = res.data?.user || res.data;
        const currentToken = res.data?.accessToken || null;

        if (isMounted) {
          saveAuthSession(currentUser, currentToken);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          clearAuthSession();
          setLoading(false);
        }
      }
    };

    verifySession();

    // Listen for custom expired event from fetch interceptor when refresh token is revoked/expired
    const handleAuthExpired = () => {
      if (isMounted) {
        clearAuthSession();
        setLoading(false);
      }
    };
    window.addEventListener('auth:expired', handleAuthExpired);

    return () => {
      isMounted = false;
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, [clearAuthSession, saveAuthSession]);

  const login = async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { user: loggedInUser, accessToken } = res.data;
    saveAuthSession(loggedInUser, accessToken);
    setLoading(false);
    return loggedInUser;
  };

  const register = async (username, email, password) => {
    const res = await apiClient.post('/auth/register', { username, email, password });
    const { user: registeredUser, accessToken } = res.data;
    saveAuthSession(registeredUser, accessToken);
    setLoading(false);
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
      setLoading(false);
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
    setLoading(false);
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
        saveAuthSession,
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
