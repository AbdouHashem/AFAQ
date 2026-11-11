import React from 'react';
import { ArrowLeft } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  withArrow?: boolean;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

type ButtonAsButton = BaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
    href?: undefined;
  };

type ButtonAsAnchor = BaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & {
    href: string;
    disabled?: boolean;
  };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-700 text-white border border-transparent hover:bg-brand-800 active:bg-brand-900 shadow-xs',
  secondary:
    'bg-accent-500 text-brand-900 border border-transparent hover:bg-accent-400 active:bg-accent-600 shadow-xs',
  outline:
    'bg-transparent text-brand-700 border border-brand-700 hover:bg-brand-50 active:bg-brand-100',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-4 py-2 text-small',
  md: 'min-h-11 px-6 py-2.5 text-small',
  lg: 'min-h-12 px-7 py-3 text-body',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  withArrow = false,
  icon,
  className = '',
  children,
  ...props
}) => {
  const baseClasses =
    'group inline-flex items-center justify-center gap-2 rounded-full font-ui font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

  const combined = `${baseClasses} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`;

  const content = (
    <>
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {withArrow && (
        <ArrowLeft
          className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:-translate-x-0.5"
          strokeWidth={2}
          aria-hidden="true"
        />
      )}
    </>
  );

  if ('href' in props && props.href !== undefined) {
    const { href, disabled, ...anchorRest } = props as ButtonAsAnchor;
    return (
      <a
        href={disabled ? undefined : href}
        aria-disabled={disabled || undefined}
        className={`${combined} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        {...anchorRest}
      >
        {content}
      </a>
    );
  }

  const buttonProps = props as ButtonAsButton;
  return (
    <button type={buttonProps.type ?? 'button'} className={combined} {...buttonProps}>
      {content}
    </button>
  );
};
