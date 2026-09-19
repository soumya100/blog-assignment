import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient, { setInMemoryToken, queuePendingRevocation } from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // In-memory state only - Zero localStorage usage
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const saveAuthSession = (newUser, newAccessToken) => {
    setUser(newUser);
    setToken(newAccessToken || null);
    if (newAccessToken) {
      setInMemoryToken(newAccessToken);
    }
  };

  const clearAuthSession = useCallback(() => {
    setUser(null);
    setToken(null);
    setInMemoryToken(null);
  }, []);

  // Check auth session on startup via HttpOnly cookies
  useEffect(() => {
    const verifySession = async () => {
      try {
        // Fetch client sends HttpOnly cookies automatically via credentials: 'include'
        const res = await apiClient.get('/auth/me');
        const currentUser = res.data?.user || res.data;
        const currentToken = res.data?.accessToken || null;
        saveAuthSession(currentUser, currentToken);
      } catch (err) {
        // If not authenticated or refresh failed in interceptor, session is clear
        clearAuthSession();
      } finally {
        setLoading(false);
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
    const { user: loggedInUser, accessToken } = res.data;
    saveAuthSession(loggedInUser, accessToken);
    return loggedInUser;
  };

  const register = async (username, email, password) => {
    const res = await apiClient.post('/auth/register', { username, email, password });
    const { user: registeredUser, accessToken } = res.data;
    saveAuthSession(registeredUser, accessToken);
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
