import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import apiClient from '../../api/client';
import ConfirmModal from '../../components/ConfirmModal';
import FeedbackDialog from '../../components/FeedbackDialog';

const campaignSchema = z.object({
  subject: z.string().trim().min(3, 'Subject must contain at least 3 characters.').max(160, 'Subject cannot exceed 160 characters.'),
  message: z.string().trim().min(10, 'Message must contain at least 10 characters.').max(10000, 'Message cannot exceed 10,000 characters.'),
});

export default function NewsletterCampaign() {
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState(null);
  const [dialog, setDialog] = useState({ open: false, tone: 'info', title: '', message: '' });
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(campaignSchema), defaultValues: { subject: '', message: '' } });

  const submit = (values) => { setPendingValues(values); setConfirmOpen(true); };
  const sendCampaign = async () => {
    if (!pendingValues) return;
    setBusy(true);
    setConfirmOpen(false);
    try {
      const response = await apiClient.post('/admin/newsletter/send', pendingValues);
      setDialog({ open: true, tone: 'success', title: 'Campaign completed', message: 'The newsletter was sent to ' + (response.data?.sent || 0) + ' confirmed subscriber(s).' });
    } catch (error) {
      setDialog({ open: true, tone: 'error', title: 'Campaign failed', message: error.message || 'The newsletter could not be sent. Please try again.' });
    } finally { setBusy(false); setPendingValues(null); }
  };

  return <section className="admin-content">
    <h2>Newsletter campaigns</h2>
    <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 1.5rem' }}>Send a plain-text campaign to subscribers who completed double opt-in confirmation.</p>
    <form className="card" style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }} onSubmit={handleSubmit(submit)} noValidate>
      <label className="form-label">Subject<input className="form-input" maxLength={160} aria-invalid={Boolean(errors.subject)} {...register('subject')} /></label>
      {errors.subject && <p className="form-error" role="alert">{errors.subject.message}</p>}
      <label className="form-label">Message<textarea className="form-textarea" rows={10} maxLength={10000} aria-invalid={Boolean(errors.message)} {...register('message')} /></label>
      {errors.message && <p className="form-error" role="alert">{errors.message.message}</p>}
      <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send to confirmed subscribers'}</button>
    </form>
    <ConfirmModal isOpen={confirmOpen} title="Send newsletter campaign?" message="This will send the prepared newsletter to every confirmed subscriber. This action cannot be undone." confirmText="Send campaign" isLoading={busy} onConfirm={sendCampaign} onCancel={() => { setConfirmOpen(false); setPendingValues(null); }} />
    <FeedbackDialog {...dialog} onClose={() => setDialog((current) => ({ ...current, open: false }))} />
  </section>;
}
