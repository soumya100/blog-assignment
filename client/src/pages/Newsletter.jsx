import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../api/client';

export default function Newsletter() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  const mode = location.pathname.endsWith('/confirm') ? 'confirm' : location.pathname.endsWith('/unsubscribe') ? 'unsubscribe' : 'subscribe';
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token || mode === 'subscribe') return;
    let active = true;
    setBusy(true);
    const request = mode === 'confirm'
      ? apiClient.get('/newsletter/confirm', { params: { token } })
      : apiClient.get('/newsletter/unsubscribe', { params: { token } });
    request.then((response) => { if (active) setMessage(response.message || 'Your request was completed.'); })
      .catch((error) => { if (active) setMessage(error.message || 'This link is invalid or expired.'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [token, mode]);

  const submit = async (event) => {
    event.preventDefault();
    if (!consent) return;
    setBusy(true);
    try {
      const response = await apiClient.post('/newsletter/subscribe', { email, consent: true });
      setMessage(response.message || 'Check your inbox to confirm your subscription.');
      setEmail('');
      setConsent(false);
    } catch (error) {
      toast.error(error.message || 'Unable to subscribe');
    } finally { setBusy(false); }
  };

  return <main className="container-narrow" style={{ padding: '4rem 0', maxWidth: 620 }}>
    <section className="card" style={{ padding: '2rem' }}>
      <h1>DevLog newsletter</h1>
      {mode !== 'subscribe' ? <p role="status">{busy ? 'Processing your request…' : message}</p> : <>
        <p style={{ color: 'var(--text-secondary)', margin: '0.75rem 0 1.5rem' }}>Get new engineering articles and platform updates in your inbox. Confirm your email before receiving newsletters.</p>
        <form onSubmit={submit}>
          <label className="form-label" htmlFor="newsletter-email">Email address</label>
          <input id="newsletter-email" type="email" required maxLength={254} className="form-input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
          <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'start', margin: '1rem 0' }}><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> I agree to receive the DevLog newsletter. I can unsubscribe at any time.</label>
          <button className="btn btn-primary" type="submit" disabled={busy || !consent}>{busy ? 'Submitting…' : 'Subscribe'}</button>
        </form>
        {message && <p role="status" style={{ marginTop: '1rem' }}>{message}</p>}
      </>}
    </section>
  </main>;
}
