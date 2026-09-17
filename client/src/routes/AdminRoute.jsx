import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '5rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Verifying administrative credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;
