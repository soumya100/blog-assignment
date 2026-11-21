import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import apiClient from '../api/client';
import FeedbackDialog from '../components/FeedbackDialog';

const schema = z.object({
  email: z.string().trim().min(1, 'Email address is required.').email('Enter a valid email address.').max(254, 'Email address is too long.'),
  consent: z.boolean().refine(Boolean, 'Please confirm your consent before subscribing.'),
});

export default function Newsletter() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  const mode = location.pathname.endsWith('/confirm') ? 'confirm' : location.pathname.endsWith('/unsubscribe') ? 'unsubscribe' : 'subscribe';
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [dialog, setDialog] = useState({ open: false, tone: 'info', title: '', message: '' });
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', consent: false } });

  useEffect(() => {
    if (!token || mode === 'subscribe') return undefined;
    let active = true;
    setBusy(true);
    const request = mode === 'confirm'
      ? apiClient.get('/newsletter/confirm', { params: { token } })
      : apiClient.get('/newsletter/unsubscribe', { params: { token } });
    request.then((response) => { if (active) setMessage(response.message || 'Your request was completed.'); })
      .catch((error) => { if (active) setDialog({ open: true, tone: 'error', title: 'Newsletter link unavailable', message: error.message || 'This link is invalid or expired.' }); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [token, mode]);

  const submit = async ({ email }) => {
    setBusy(true);
    try {
      const response = await apiClient.post('/newsletter/subscribe', { email, consent: true });
      setMessage(response.message || 'Check your inbox to confirm your subscription.');
      reset();
    } catch (error) {
      setDialog({ open: true, tone: 'error', title: 'Unable to subscribe', message: error.message || 'Please try again in a moment.' });
    } finally { setBusy(false); }
  };

  return <>
    <main className="container-narrow" style={{ padding: '4rem 0', maxWidth: 620 }}>
      <section className="card" style={{ padding: '2rem' }}>
        <h1>DevLog newsletter</h1>
        {mode !== 'subscribe' ? <p role="status">{busy ? 'Processing your request…' : message}</p> : <>
          <p style={{ color: 'var(--text-secondary)', margin: '0.75rem 0 1.5rem' }}>Get new engineering articles and platform updates in your inbox. Confirm your email before receiving newsletters.</p>
          <form onSubmit={handleSubmit(submit)} noValidate>
            <label className="form-label" htmlFor="newsletter-email">Email address</label>
            <input id="newsletter-email" type="email" maxLength={254} className="form-input" placeholder="you@example.com" aria-invalid={Boolean(errors.email)} {...register('email')} />
            {errors.email && <p className="form-error" role="alert">{errors.email.message}</p>}
            <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'start', margin: '1rem 0' }}><input type="checkbox" {...register('consent')} /> I agree to receive the DevLog newsletter. I can unsubscribe at any time.</label>
            {errors.consent && <p className="form-error" role="alert">{errors.consent.message}</p>}
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Subscribe'}</button>
          </form>
          {message && <p role="status" style={{ marginTop: '1rem' }}>{message}</p>}
        </>}
      </section>
    </main>
    <FeedbackDialog {...dialog} onClose={() => setDialog((current) => ({ ...current, open: false }))} />
  </>;
}
