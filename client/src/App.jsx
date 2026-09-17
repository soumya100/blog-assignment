import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import NotificationToast from './components/NotificationToast';

// Pages
import Home from './pages/Home';
import PostDetails from './pages/PostDetails';
import CreateEditPost from './pages/CreateEditPost';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import PostManagement from './pages/admin/PostManagement';
import CommentManagement from './pages/admin/CommentManagement';
import ActivityLogs from './pages/admin/ActivityLogs';

// Route Guards
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              <Navbar />
              <NotificationToast />

              <div style={{ flex: 1 }}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/posts/:id" element={<PostDetails />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

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

                  {/* Protected Admin Routes */}
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
              </div>

              <Footer />
            </div>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
