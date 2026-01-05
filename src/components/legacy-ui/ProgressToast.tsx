'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, no-console, max-lines-per-function */

import React from 'react';
import { XMarkIcon, MinusIcon } from '@heroicons/react/24/outline';

/**
 * ProgressToast - Elegant progress notification component
 * Shows processing status with progress bar, similar to ignite-hedis app
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the toast is visible
 * @param {boolean} props.isMinimized - Whether the toast is minimized
 * @param {string} props.title - Toast title (e.g., "Processing Batch")
 * @param {string} props.message - Status message
 * @param {number} props.current - Current progress count
 * @param {number} props.total - Total items to process
 * @param {number} props.progressPercent - Progress percentage (0-100)
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onMinimize - Minimize/maximize handler
 * @param {Object} props.metadata - Additional metadata to display
 */
export function ProgressToast({
  isOpen,
  isMinimized,
  title = 'Processing',
  message = 'Processing...',
  current = 0,
  total = 0,
  progressPercent = 0,
  onClose,
  onMinimize,
  metadata = null,
}: any) {
  // Debug logging
  React.useEffect(() => {
    if (isOpen) {
      console.log('🎨 ProgressToast opened:', {
        title,
        message,
        current,
        total,
        progressPercent,
        metadata,
      });
    }
  }, [isOpen, title, message, current, total, progressPercent, metadata]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed right-4 bottom-4 z-[60] w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl transition-all duration-300 ${
        isMinimized ? 'max-h-12' : 'max-h-96'
      } overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-2">
        <h3 className="flex items-center text-sm font-semibold text-blue-900">
          <div className="mr-2 h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
          {title}
        </h3>
        <div className="flex items-center space-x-1">
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="p-1 text-blue-400 transition-colors hover:text-blue-600"
              title={isMinimized ? 'Maximize' : 'Minimize'}
            >
              <MinusIcon className="h-4 w-4" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-blue-400 transition-colors hover:text-blue-600"
              title="Close"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content - Full View */}
      {!isMinimized && (
        <div className="max-h-80 overflow-y-auto p-4">
          <div className="space-y-3">
            {/* Status Message */}
            <div className="flex items-center space-x-2 text-sm">
              <div className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-blue-500"></div>
              <span className="font-medium text-gray-800">{message}</span>
            </div>

            {/* Progress Count */}
            {total > 0 && (
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-blue-600">{current}</span> of{' '}
                <span className="font-semibold text-gray-700">{total}</span> completed
              </div>
            )}

            {/* Progress Bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              ></div>
            </div>

            {/* Progress Percentage */}
            <div className="text-right text-xs text-gray-500">
              {Math.round(progressPercent)}% complete
            </div>

            {/* Metadata */}
            {metadata && (
              <div className="border-t border-gray-100 pt-2">
                <div className="space-y-1 text-xs">
                  {Object.entries(metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-500">{key}:</span>
                      <span className="font-medium text-gray-700">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content - Minimized View */}
      {isMinimized && (
        <div className="px-4 py-1">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
              <span>
                {current} of {total} ({Math.round(progressPercent)}%)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * SimpleToast - Simple notification toast without progress
 * Similar to current toast but with better styling
 */
export function SimpleToast({ isOpen, message, type = 'success', duration = 3000, onClose }: any) {
  const [visible, setVisible] = React.useState(isOpen);

  React.useEffect(() => {
    console.log('🔔 SimpleToast state change:', { isOpen, message, type, visible });
    setVisible(isOpen);
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose, message, type, visible]);

  if (!visible) {
    console.log('🔔 SimpleToast not visible, returning null');
    return null;
  }

  console.log('🔔 SimpleToast rendering with:', { message, type });

  const bgColors: Record<string, string> = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
  };

  const textColors: Record<string, string> = {
    success: 'text-green-50',
    error: 'text-red-50',
    info: 'text-blue-50',
    warning: 'text-yellow-900',
  };

  return (
    <div className="animate-slide-in-right fixed top-4 right-4 z-50">
      <div
        className={`${bgColors[type]} ${textColors[type]} flex max-w-md items-center space-x-3 rounded-lg px-4 py-3 shadow-lg`}
      >
        <div className="flex-1 text-sm font-medium">{message}</div>
        {onClose && (
          <button
            onClick={() => {
              setVisible(false);
              onClose();
            }}
            className="flex-shrink-0 transition-opacity hover:opacity-75"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default ProgressToast;
