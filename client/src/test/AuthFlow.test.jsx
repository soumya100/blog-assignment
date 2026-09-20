import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../api/queryClient';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import apiClient from '../api/client';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';

describe('Frontend Authentication Views', () => {
  test('renders Login form with email, password fields and OAuth options', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <BrowserRouter>
              <Login />
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );

    expect(screen.getByPlaceholderText(/name@company.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••••••/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.getByText(/sign in with google oauth 2.0/i)).toBeInTheDocument();
    expect(screen.getByText(/sign in with facebook oauth 2.0/i)).toBeInTheDocument();
  });

  test('renders Register form with username and password checklist', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <BrowserRouter>
              <Register />
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );

    expect(screen.getByPlaceholderText(/dev_lead/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/developer@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete registration/i })).toBeInTheDocument();
  });

  test('renders Forgot Password view with email input and recovery action', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <BrowserRouter>
              <ForgotPassword />
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );

    expect(screen.getByPlaceholderText(/name@company.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send recovery code/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /account recovery/i })).toBeInTheDocument();
  });
});

describe('Pure HttpOnly Cookie Authentication & Session Restoration', () => {
  let originalLocalStorage;
  let originalSessionStorage;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test('restores user session from /auth/me on reload without storing tokens in localStorage', async () => {
    const mockUser = { id: 'usr-101', username: 'alex_dev', email: 'alex@company.com', role: 'AUTHOR' };

    // Mock apiClient.get for /auth/me
    const getSpy = vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      if (url === '/auth/me') {
        return {
          success: true,
          data: {
            user: mockUser,
            accessToken: 'mock-in-memory-token',
          },
        };
      }
      return {};
    });

    const TestConsumer = () => {
      const { user, loading, isAuthenticated } = useAuth();
      if (loading) return <div>Checking secure cookie session...</div>;
      return (
        <div>
          <div data-testid="auth-status">{isAuthenticated ? 'AUTHENTICATED' : 'UNAUTHENTICATED'}</div>
          <div data-testid="user-email">{user?.email}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Should resolve session
    expect(await screen.findByText('AUTHENTICATED')).toBeInTheDocument();
    expect(screen.getByTestId('user-email')).toHaveTextContent('alex@company.com');

    // Verify localStorage & sessionStorage contain ZERO authentication tokens or credentials
    expect(localStorage.getItem('devlog_token')).toBeNull();
    expect(localStorage.getItem('devlog_refresh_token')).toBeNull();
    expect(localStorage.getItem('devlog_user')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(sessionStorage.getItem('devlog_token')).toBeNull();
    expect(sessionStorage.getItem('devlog_user')).toBeNull();

    getSpy.mockRestore();
  });

  test('login sets in-memory state and DOES NOT write tokens to localStorage or sessionStorage', async () => {
    const mockUser = { id: 'usr-202', username: 'bob_engineer', email: 'bob@company.com', role: 'USER' };

    vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Unauthorized'));
    const postSpy = vi.spyOn(apiClient, 'post').mockImplementation(async (url) => {
      if (url === '/auth/login') {
        return {
          success: true,
          data: {
            user: mockUser,
            accessToken: 'mock-in-memory-access-token',
          },
        };
      }
      return {};
    });

    const LoginConsumer = () => {
      const { user, login, isAuthenticated } = useAuth();
      return (
        <div>
          <button onClick={() => login('bob@company.com', 'SecurePass123!')}>Sign In Action</button>
          <div data-testid="status">{isAuthenticated ? 'LOGGED_IN' : 'LOGGED_OUT'}</div>
          <div data-testid="user-name">{user?.username}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <LoginConsumer />
      </AuthProvider>
    );

    const button = screen.getByRole('button', { name: 'Sign In Action' });
    await act(async () => {
      await button.click();
    });

    expect(await screen.findByText('LOGGED_IN')).toBeInTheDocument();
    expect(screen.getByTestId('user-name')).toHaveTextContent('bob_engineer');

    // Strict check: No auth tokens in client storage
    expect(localStorage.getItem('devlog_token')).toBeNull();
    expect(localStorage.getItem('devlog_user')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('devlog_token')).toBeNull();
    expect(sessionStorage.getItem('devlog_user')).toBeNull();

    postSpy.mockRestore();
    vi.restoreAllMocks();
  });

  test('logout clears in-memory state and keeps localStorage clean', async () => {
    const mockUser = { id: 'usr-303', username: 'claire_lead', email: 'claire@company.com', role: 'ADMIN' };

    vi.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: { user: mockUser, accessToken: 'token-abc' },
    });
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ success: true });

    const LogoutConsumer = () => {
      const { logout, isAuthenticated, user } = useAuth();
      return (
        <div>
          <button onClick={logout}>Sign Out Action</button>
          <div data-testid="auth-state">{isAuthenticated ? 'ACTIVE' : 'CLEARED'}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <LogoutConsumer />
      </AuthProvider>
    );

    expect(await screen.findByText('ACTIVE')).toBeInTheDocument();

    const logoutBtn = screen.getByRole('button', { name: 'Sign Out Action' });
    await act(async () => {
      await logoutBtn.click();
    });

    expect(await screen.findByText('CLEARED')).toBeInTheDocument();
    expect(postSpy).toHaveBeenCalledWith('/auth/logout');

    // Strict storage check
    expect(localStorage.getItem('devlog_token')).toBeNull();
    expect(localStorage.getItem('devlog_user')).toBeNull();
    expect(sessionStorage.getItem('devlog_token')).toBeNull();

    vi.restoreAllMocks();
  });
});

