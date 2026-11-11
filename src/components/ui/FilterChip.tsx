import React from 'react';
import { X } from 'lucide-react';

export interface FilterChipProps {
  label: string;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  onRemove,
  disabled = false,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-3.5 py-1.5 font-ui text-small font-medium text-brand-900 whitespace-nowrap shrink-0 transition-colors duration-150 ${
        disabled ? 'opacity-50 pointer-events-none' : 'hover:bg-accent-100 hover:border-accent-300'
      } ${className}`}
    >
      <span>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`إزالة فلتر ${label}`}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-brand-700 hover:bg-accent-200/70 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
        </button>
      )}
    </span>
  );
};
