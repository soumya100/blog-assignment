import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient, { setInMemoryToken } from '../api/client';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        alert('OAuth authentication failed: ' + error);
        navigate('/login');
        return;
      }

      if (token) {
        setInMemoryToken(token);
      }

      try {
        await apiClient.get('/auth/me');
        window.location.href = '/';
      } catch (err) {
        console.error('Failed to verify session after OAuth callback:', err);
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="container" style={{ paddingTop: '6rem', textAlign: 'center' }}>
      <div className="card" style={{ maxWidth: '400px', margin: '0 auto', padding: '2.5rem' }}>
        <h3>Completing Social Sign-In...</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Exchanging cryptographic credentials with server.
        </p>
        <div className="skeleton" style={{ height: '0.5rem', marginTop: '1.5rem', borderRadius: 'var(--radius-full)' }}></div>
      </div>
    </div>
  );
};

export default OAuthCallback;
