import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Generate a smart list of page numbers and ellipses for SaaS pagination
 */
const getPageNumbers = (current, total) => {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (current <= 3) {
    return [1, 2, 3, 4, '...', total];
  }

  if (current >= total - 2) {
    return [1, '...', total - 3, total - 2, total - 1, total];
  }

  return [1, '...', current - 1, current, current + 1, '...', total];
};

const Pagination = ({ pagination, onPageChange, itemLabel = 'results' }) => {
  if (!pagination || pagination.totalPages <= 1) return null;

  const {
    page = 1,
    totalPages = 1,
    total = null,
    limit = 10,
    hasPrevPage,
    hasNextPage,
  } = pagination;

  const canPrev = typeof hasPrevPage === 'boolean' ? hasPrevPage : page > 1;
  const canNext = typeof hasNextPage === 'boolean' ? hasNextPage : page < totalPages;

  const pageNumbers = getPageNumbers(page, totalPages);

  const startItem = total ? Math.min((page - 1) * (limit || 10) + 1, total) : null;
  const endItem = total ? Math.min(page * (limit || 10), total) : null;

  return (
    <div className="saas-pagination-wrapper">
      {/* Contextual Info Counter */}
      <div className="saas-pagination-info">
        {total ? (
          <span>
            Showing <strong>{startItem}–{endItem}</strong> of <strong>{total}</strong> {itemLabel}
          </span>
        ) : (
          <span>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </span>
        )}
      </div>

      {/* Glassmorphic SaaS Navigation Dock */}
      <nav aria-label="Pagination Navigation" className="saas-pagination-dock">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          className="saas-page-btn nav-btn prev"
          title="Go to previous page"
        >
          <ChevronLeft size={15} />
          <span>Previous</span>
        </button>

        {/* Numbered Page Buttons with Ellipses */}
        {pageNumbers.map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className="saas-page-ellipsis">
              •••
            </span>
          ) : (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => p !== page && onPageChange(p)}
              className={`saas-page-btn ${p === page ? 'active' : ''}`}
              aria-current={p === page ? 'page' : undefined}
              title={`Page ${p}`}
            >
              {p}
            </button>
          )
        )}

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          className="saas-page-btn nav-btn next"
          title="Go to next page"
        >
          <span>Next</span>
          <ChevronRight size={15} />
        </button>
      </nav>
    </div>
  );
};

export default Pagination;

