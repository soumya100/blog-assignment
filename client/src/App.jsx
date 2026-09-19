import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import queryClient from './api/queryClient';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { PageLoader } from './components/SkeletonLoader';

// Lazy-loaded Public Pages
const Home = lazy(() => import('./pages/Home'));
const PostDetails = lazy(() => import('./pages/PostDetails'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));

// Lazy-loaded Authenticated User Pages
const CreateEditPost = lazy(() => import('./pages/CreateEditPost'));
const Profile = lazy(() => import('./pages/Profile'));

// Lazy-loaded Admin Pages
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const PostManagement = lazy(() => import('./pages/admin/PostManagement'));
const CommentManagement = lazy(() => import('./pages/admin/CommentManagement'));
const ActivityLogs = lazy(() => import('./pages/admin/ActivityLogs'));

// Route Guards
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';

const ThemedToastContainer = () => {
  const { theme } = useTheme();
  return (
    <ToastContainer
      position="bottom-right"
      autoClose={3500}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme={theme === 'dark' ? 'dark' : 'light'}
    />
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <BrowserRouter>
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <Navbar />
                <ThemedToastContainer />

                <main id="main-content" style={{ flex: 1 }}>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/" element={<Home />} />
                      <Route path="/posts/:id" element={<PostDetails />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/reset-password/:token" element={<ResetPassword />} />
                      <Route path="/oauth/callback" element={<OAuthCallback />} />

                      {/* Authenticated User Routes */}
                      <Route
                        path="/posts/new"
                        element={
                          <ProtectedRoute>
                            <CreateEditPost />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/posts/:id/edit"
                        element={
                          <ProtectedRoute>
                            <CreateEditPost />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <ProtectedRoute>
                            <Profile />
                          </ProtectedRoute>
                        }
                      />

                      {/* Admin Protected Routes */}
                      <Route
                        path="/admin"
                        element={
                          <AdminRoute>
                            <AdminLayout />
                          </AdminRoute>
                        }
                      >
                        <Route index element={<AdminDashboard />} />
                        <Route path="users" element={<UserManagement />} />
                        <Route path="posts" element={<PostManagement />} />
                        <Route path="comments" element={<CommentManagement />} />
                        <Route path="activity" element={<ActivityLogs />} />
                      </Route>

                      {/* 404 Fallback */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </main>

                <Footer />
              </div>
            </BrowserRouter>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
