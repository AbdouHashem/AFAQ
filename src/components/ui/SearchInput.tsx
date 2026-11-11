import React from 'react';
import { AlertCircle, Search, X } from 'lucide-react';

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  onClear?: () => void;
  containerClassName?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  label,
  error,
  onClear,
  value,
  disabled,
  className = '',
  containerClassName = '',
  id,
  ...props
}) => {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hasValue = typeof value === 'string' && value.length > 0;

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block mb-1.5 text-small font-ui font-medium text-brand-900"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <Search
          className={`pointer-events-none absolute start-3.5 h-5 w-5 ${
            error
              ? 'text-error'
              : disabled
                ? 'text-slate-400'
                : 'text-slate-500'
          }`}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <input
          id={inputId}
          type="search"
          value={value}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-12 w-full rounded-md border bg-white ps-11 ${
            hasValue && onClear ? 'pe-11' : 'pe-4'
          } font-ui text-small text-brand-900 placeholder:text-slate-500 transition-colors duration-150 focus:outline-none focus:ring-2 ${
            error
              ? 'border-error focus:border-error focus:ring-error/20'
              : 'border-slate-200 hover:border-slate-300 focus:border-accent-500 focus:ring-accent-200'
          } disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 [&::-webkit-search-cancel-button]:hidden ${className}`}
          {...props}
        />
        {hasValue && onClear && !disabled && (
          <button
            type="button"
            onClick={onClear}
            aria-label="مسح البحث"
            className="absolute end-2.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 inline-flex items-center gap-1.5 rounded-sm bg-red-50 px-2.5 py-1 text-caption font-ui font-medium text-error"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};
