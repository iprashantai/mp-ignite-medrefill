import React from 'react';
import { cn } from '@/lib/utils';
import type { TableDensity } from './table';

/**
 * Density option configuration
 */
interface DensityOption {
  value: TableDensity;
  label: string;
  icon: React.ReactNode;
}

/**
 * Density Toggle Component
 *
 * DS Reference: COMPONENT.TABLE.DENSITY
 *
 * @example
 * ```tsx
 * <DensityToggle density={density} onDensityChange={setDensity} />
 * ```
 */
export interface DensityToggleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current density mode */
  density: TableDensity;
  /** Density change handler */
  onDensityChange: (density: TableDensity) => void;
  /** Additional CSS classes */
  className?: string;
}

export function DensityToggle({
  density,
  onDensityChange,
  className,
  ...props
}: DensityToggleProps) {
  const densityOptions: DensityOption[] = [
    {
      value: 'comfortable',
      label: 'Comfortable density',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      ),
    },
    {
      value: 'compact',
      label: 'Compact density',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      ),
    },
    {
      value: 'dense',
      label: 'Dense',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 12h16M4 16h16"
          />
        </svg>
      ),
    },
  ];

  return (
    <div
      className={cn(
        'flex items-center overflow-hidden rounded-lg border border-gray-300',
        className
      )}
      role="group"
      aria-label="Table density"
      {...props}
    >
      {densityOptions.map((option, index) => {
        const isActive = density === option.value;
        const isFirst = index === 0;
        const isLast = index === densityOptions.length - 1;
        const borderClass = !isFirst && !isLast ? 'border-x border-gray-300' : '';

        return (
          <button
            key={option.value}
            onClick={() => onDensityChange(option.value)}
            className={cn(
              'px-2.5 py-2 transition-colors',
              borderClass,
              isActive ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            )}
            title={option.label}
            aria-label={option.label}
            aria-pressed={isActive}
            type="button"
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}

export default DensityToggle;
