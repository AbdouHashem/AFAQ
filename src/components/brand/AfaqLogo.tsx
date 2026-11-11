import React from 'react';

interface AfaqLogoProps {
  variant?: 'default' | 'inverse';
  showWordmark?: boolean;
  showEnglishSub?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AfaqLogo: React.FC<AfaqLogoProps> = ({
  variant = 'default',
  showWordmark = true,
  showEnglishSub = false,
  size = 'md',
  className = '',
}) => {
  const iconDimensions =
    size === 'sm' ? 'h-7 w-9' : size === 'lg' ? 'h-10 w-12' : 'h-8 w-10';
  const arabicSize =
    size === 'sm' ? 'text-h4' : size === 'lg' ? 'text-h2' : 'text-h3';

  const primaryStroke =
    variant === 'inverse' ? 'var(--afaq-accent-200)' : 'var(--afaq-brand-700)';
  const accentStroke =
    variant === 'inverse' ? 'var(--afaq-accent-400)' : 'var(--afaq-accent-500)';
  const textColor = variant === 'inverse' ? 'text-white' : 'text-brand-700';
  const subTextColor =
    variant === 'inverse' ? 'text-brand-200' : 'text-brand-700';

  return (
    <span className={`inline-flex items-center gap-2.5 shrink-0 ${className}`}>
      <svg
        viewBox="0 0 64 46"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconDimensions} shrink-0`}
        aria-hidden="true"
      >
        {/* Upper Deep Blue Horizon Arch */}
        <path
          d="M6 39C14.5 23.5 23.5 9.5 34.5 7.5C43.5 5.8 50.5 14 58 29.5"
          stroke={primaryStroke}
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Lower Turquoise Rising Curve */}
        <path
          d="M17 40C24 29 31.5 22.5 39.5 22.5C46.2 22.5 51.5 28 57 38.5"
          stroke={accentStroke}
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showWordmark && (
        <span className="inline-flex flex-col leading-none">
          <span
            className={`font-ui font-bold tracking-tight whitespace-nowrap ${arabicSize} ${textColor}`}
          >
            آفاق
          </span>
          {showEnglishSub && (
            <span
              className={`font-ui text-caption font-semibold tracking-[0.2em] uppercase mt-0.5 whitespace-nowrap ${subTextColor}`}
            >
              AFAQ
            </span>
          )}
        </span>
      )}
    </span>
  );
};
