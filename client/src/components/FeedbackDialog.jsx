import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const icons = { success: CheckCircle2, error: AlertCircle, info: Info };

export default function FeedbackDialog({ open, tone = 'info', title, message, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;
  const Icon = icons[tone] || Info;
  return createPortal(
    <div className="feedback-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose?.();
    }}>
      <section className="feedback-dialog" role="alertdialog" aria-modal="true" aria-labelledby="feedback-dialog-title" aria-describedby="feedback-dialog-message">
        <button type="button" className="feedback-dialog-close" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        <span className={`feedback-dialog-icon is-${tone}`}><Icon size={22} /></span>
        <h2 id="feedback-dialog-title">{title}</h2>
        <p id="feedback-dialog-message">{message}</p>
        {children}
        <footer><button type="button" className="btn btn-primary" onClick={onClose}>Got it</button></footer>
      </section>
    </div>,
    document.body
  );
}
