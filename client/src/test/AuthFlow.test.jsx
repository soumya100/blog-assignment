import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import Login from '../pages/Login';
import Register from '../pages/Register';

describe('Frontend Authentication Views', () => {
  test('renders Login form with email, password fields and OAuth options', () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Login />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByPlaceholderText(/name@company.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••••••/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.getByText(/sign in with google oauth 2.0/i)).toBeInTheDocument();
    expect(screen.getByText(/sign in with facebook oauth 2.0/i)).toBeInTheDocument();
  });

  test('renders Register form with username and password checklist', () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Register />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByPlaceholderText(/dev_lead/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/developer@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete registration/i })).toBeInTheDocument();
  });
});
