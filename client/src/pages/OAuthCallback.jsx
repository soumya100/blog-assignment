import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import apiClient, { setInMemoryToken } from '../api/client';
import { extractErrorMessage } from '../hooks/useApi';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { saveAuthSession } = useAuth();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    const handleCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        toast.error(`Social login failed: ${decodeURIComponent(error)}`, { autoClose: 5000 });
        navigate('/login', { replace: true });
        return;
      }

      if (!token) {
        toast.error('Authentication token missing from provider redirect.', { autoClose: 4000 });
        navigate('/login', { replace: true });
        return;
      }

      setInMemoryToken(token);

      try {
        // Establish HttpOnly cookies directly on the caller's origin (including through Render proxy)
        const sessionRes = await apiClient.post('/auth/oauth/session', { token });
        const authUser = sessionRes.data?.user || sessionRes.data?.data?.user;
        const freshAccessToken = sessionRes.data?.accessToken || sessionRes.data?.data?.accessToken || token;

        if (authUser) {
          saveAuthSession(authUser, freshAccessToken);
          toast.success('Successfully signed in with social account!', { autoClose: 3500 });
          navigate('/', { replace: true });
          return;
        }
      } catch (sessionErr) {
        console.warn('POST /auth/oauth/session failed, attempting fallback to /auth/me:', sessionErr);
      }

      try {
        // Fallback: Query /auth/me with Bearer token
        const meRes = await apiClient.get('/auth/me');
        const authUser = meRes.data?.user || meRes.data?.data?.user || meRes.data;
        const freshAccessToken = meRes.data?.accessToken || meRes.data?.data?.accessToken || token;

        if (authUser) {
          saveAuthSession(authUser, freshAccessToken);
          toast.success('Successfully signed in with social account!', { autoClose: 3500 });
          navigate('/', { replace: true });
          return;
        }
        throw new Error('User profile empty in server response');
      } catch (err) {
        console.error('Failed to verify session after OAuth callback:', err);
        toast.error(extractErrorMessage(err, 'Failed to complete social authentication. Please try again.'));
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [searchParams, navigate, saveAuthSession]);

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
