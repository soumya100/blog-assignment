import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FeedbackDialog from '../components/FeedbackDialog';

describe('FeedbackDialog accessibility and dismissal behavior', () => {
  test('renders an accessible modal alert dialog with its title and description', () => {
    render(
      <FeedbackDialog
        open
        tone="success"
        title="Export complete"
        message="Your JSON backup is ready."
        onClose={vi.fn()}
      />
    );

    const dialog = screen.getByRole('alertdialog', { name: 'Export complete' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-describedby', 'feedback-dialog-message');
    expect(screen.getByText('Your JSON backup is ready.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument();
  });

  test('closes when Escape is pressed and restores body scrolling on unmount', () => {
    const onClose = vi.fn();
    document.body.style.overflow = 'auto';
    const { unmount } = render(
      <FeedbackDialog open title="Saved" message="Changes saved." onClose={onClose} />
    );

    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();
    expect(document.body.style.overflow).toBe('auto');
    document.body.style.overflow = '';
  });

  test('closes when the backdrop itself is clicked, but not when the dialog is clicked', () => {
    const onClose = vi.fn();
    render(
      <FeedbackDialog open title="Notice" message="Review this update." onClose={onClose} />
    );
    const backdrop = document.querySelector('.feedback-dialog-backdrop');
    const dialog = screen.getByRole('alertdialog');

    fireEvent.mouseDown(dialog);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
