import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('accessToken') || null);
  const [loading, setLoading] = useState(true);

  const saveAuthSession = (newUser, newAccessToken, newRefreshToken) => {
    setUser(newUser);
    setToken(newAccessToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('accessToken', newAccessToken);
    if (newRefreshToken) {
      localStorage.setItem('refreshToken', newRefreshToken);
    }
  };

  const clearAuthSession = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }, []);

  // Check auth session on startup
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('accessToken');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        // Fetch client returns parsed JSON directly (no axios .data wrapper)
        const res = await apiClient.get('/auth/me');
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      } catch (err) {
        // If refresh failed in interceptor, clear session
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
      await apiClient.post('/auth/logout', {
        refreshToken: localStorage.getItem('refreshToken'),
      });
    } catch (e) {
      // Ignore network errors during logout
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
    const { user: oauthUser, accessToken, refreshToken } = res.data;
    saveAuthSession(oauthUser, accessToken, refreshToken);
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
