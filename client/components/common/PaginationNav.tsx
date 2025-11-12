import React from 'react';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function PaginationNav({
  page,
  pageSize,
  total,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
      <div className="text-sm text-gray-600">
        Page {page} of {totalPages} · Showing {(page - 1) * pageSize + 1}-
        {Math.min(page * pageSize, total)} of {total}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrev}
          className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Next
        </button>
      </div>
    </div>
  );
}
