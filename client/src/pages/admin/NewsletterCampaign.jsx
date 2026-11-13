import React, { useState } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../api/client';

export default function NewsletterCampaign() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    if (!window.confirm('Send this newsletter to every confirmed subscriber? This action cannot be undone.')) return;
    setBusy(true);
    setResult('');
    try {
      const response = await apiClient.post('/admin/newsletter/send', { subject, message });
      setResult('Sent to ' + (response.data?.sent || 0) + ' confirmed subscriber(s).');
      toast.success('Newsletter campaign completed');
    } catch (error) { toast.error(error.message || 'Campaign failed'); }
    finally { setBusy(false); }
  };
  return <section className="admin-content">
    <h2>Newsletter campaigns</h2>
    <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 1.5rem' }}>Send a plain-text campaign to subscribers who completed double opt-in confirmation.</p>
    <form className="card" style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }} onSubmit={submit}>
      <label className="form-label">Subject<input className="form-input" required minLength={3} maxLength={160} value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
      <label className="form-label">Message<textarea className="form-textarea" required minLength={10} maxLength={10000} rows={10} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
      <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send to confirmed subscribers'}</button>
      {result && <p role="status">{result}</p>}
    </form>
  </section>;
}
