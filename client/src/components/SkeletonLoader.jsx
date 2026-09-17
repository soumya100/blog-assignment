import React from 'react';

export const PostCardSkeleton = () => {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '220px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="skeleton" style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-full)' }}></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
          <div className="skeleton" style={{ width: '35%', height: '0.875rem' }}></div>
          <div className="skeleton" style={{ width: '20%', height: '0.75rem' }}></div>
        </div>
      </div>
      <div className="skeleton" style={{ width: '85%', height: '1.5rem', margin: '0.5rem 0' }}></div>
      <div className="skeleton" style={{ width: '100%', height: '1rem' }}></div>
      <div className="skeleton" style={{ width: '70%', height: '1rem' }}></div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
        <div className="skeleton" style={{ width: '4rem', height: '1.25rem', borderRadius: 'var(--radius-full)' }}></div>
        <div className="skeleton" style={{ width: '4rem', height: '1.25rem', borderRadius: 'var(--radius-full)' }}></div>
      </div>
    </div>
  );
};

export const TableRowSkeleton = ({ columns = 5 }) => {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i}>
          <div className="skeleton" style={{ width: '80%', height: '1.25rem' }}></div>
        </td>
      ))}
    </tr>
  );
};
