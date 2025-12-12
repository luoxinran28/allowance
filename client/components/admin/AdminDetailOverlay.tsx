'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface AdminDetailOverlayProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  showFooter?: boolean;
  footerContent?: React.ReactNode;
}

export function AdminDetailOverlay({
  isOpen,
  title,
  onClose,
  children,
  size = 'md',
  showFooter = false,
  footerContent = null,
}: AdminDetailOverlayProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    onClose();
    // Clear selected_id from URL
    const params = new URLSearchParams(searchParams);
    params.delete('selected_id');
    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.push(newUrl || window.location.pathname);
  };

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={handleClose}
      />

      {/* Panel - responsive positioning */}
      <div className="fixed inset-0 z-50 pointer-events-none flex items-end md:items-center md:justify-center p-4">
        <div
          className={`${sizeClasses[size]} w-full pointer-events-auto bg-white rounded-t-lg md:rounded-lg shadow-xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 md:slide-in-from-top-4 duration-300 max-h-[90vh] md:max-h-[80vh]`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 rounded transition"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 px-6 py-4">
            {children}
          </div>

          {/* Footer */}
          {showFooter && footerContent && (
            <div className="border-t border-gray-200 px-6 py-4 flex-shrink-0 bg-gray-50">
              {footerContent}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
