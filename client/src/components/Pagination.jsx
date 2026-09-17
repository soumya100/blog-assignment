import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, hasPrevPage, hasNextPage } = pagination;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        marginTop: '2.5rem',
      }}
    >
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPrevPage}
        className="btn btn-secondary btn-sm"
      >
        <ChevronLeft size={16} />
        Previous
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0 0.5rem' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Page <strong style={{ color: 'var(--text-primary)' }}>{page}</strong> of{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{totalPages}</strong>
        </span>
      </div>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNextPage}
        className="btn btn-secondary btn-sm"
      >
        Next
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default Pagination;
