import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'active' | 'inactive' | 'pending' | 'error' | 'success';
}

const variantMap: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-800' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-800' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  error: { bg: 'bg-red-100', text: 'text-red-800' },
  success: { bg: 'bg-green-100', text: 'text-green-800' },
};

export function StatusBadge({ status, variant = 'pending' }: StatusBadgeProps) {
  const styling = variantMap[variant] || variantMap.pending;

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styling.bg} ${styling.text}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
