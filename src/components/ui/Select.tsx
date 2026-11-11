import React from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  containerClassName?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  placeholder,
  error,
  disabled,
  className = '',
  containerClassName = '',
  id,
  ...props
}) => {
  const generatedId = React.useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="block mb-1.5 text-small font-ui font-medium text-brand-900"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <select
          id={selectId}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-12 w-full appearance-none rounded-md border bg-white ps-4 pe-10 font-ui text-small text-brand-900 transition-colors duration-150 focus:outline-none focus:ring-2 cursor-pointer ${
            error
              ? 'border-error focus:border-error focus:ring-error/20'
              : 'border-slate-200 hover:border-slate-300 focus:border-accent-500 focus:ring-accent-200'
          } disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className={`pointer-events-none absolute end-3.5 h-4 w-4 ${
            disabled ? 'text-slate-300' : 'text-slate-600'
          }`}
          strokeWidth={2}
          aria-hidden="true"
        />
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
