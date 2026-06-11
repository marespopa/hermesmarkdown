import React, { ReactNode } from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outlined"
  | "icon"
  | "icon-bg"
  | "tertiary"
  | "hero"
  | "warning"
  | "bare"
  | "fab-action"
  | "fab-toggle"
  | "pill-icon"
  | "menu-item";

type Props = {
  children?: ReactNode;
  variant: ButtonVariant;
  label?: string | ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  isDisabled?: boolean;
  [key: string]: any;
};

export default function Button({
  variant,
  label,
  children,
  className = "",
  isDisabled = false,
  onClick,
  ...rest
}: Props) {
  return (
    <button
      onClick={(e) => {
        if (onClick) {
          onClick(e);
        }
      }}
      disabled={isDisabled}
      {...rest}
      className={`${variantStyles(variant)} ${className}`}
    >
      {children || label}
    </button>
  );
}

// Minimalistic Base: Standardized for a premium "Pro" feel
const baseStyles =
  "rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sage disabled:opacity-30 disabled:pointer-events-none select-none border font-sans font-semibold text-ui-footnote sm:text-ui-subhead";

const variantStyles = (variant: ButtonVariant): string => {
  switch (variant) {
    case "hero":
      return `${baseStyles} h-12 px-8 bg-accent text-white border-accent hover:bg-accent-hover shadow-md active:scale-[0.98]`;

    case "primary":
      return `${baseStyles} h-11 px-6 bg-sage border-sage text-white hover:bg-accent-hover hover:border-accent-hover shadow-sm active:scale-[0.98]`;

    case "warning":
      return `${baseStyles} h-11 px-6 bg-amber-500 text-white border-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:border-amber-600 dark:hover:bg-amber-700 shadow-sm active:scale-[0.98]`;

    case "secondary":
      return `${baseStyles} h-11 px-6 bg-paper-light text-ink-light border-beige hover:bg-paper-softgray dark:bg-paper-dark-surface dark:text-ink-dark dark:border-clay dark:hover:bg-paper-dark-surface shadow-sm active:scale-[0.98]`;

    case "outlined":
      return `${baseStyles} h-11 px-4 bg-transparent border-beige text-ink-muted hover:bg-paper-softgray dark:border-clay dark:text-stone dark:hover:bg-paper-dark-surface/50 active:scale-[0.98]`;

    case "icon":
      return `${baseStyles} w-10 h-10 p-0 bg-transparent border-none text-ink-muted hover:text-ink-light dark:text-stone dark:hover:text-ink-dark hover:bg-paper-softgray dark:hover:bg-paper-dark-surface rounded-full active:scale-[0.96]`;

    case "icon-bg":
      return `${baseStyles} w-10 h-10 p-0 bg-paper-light border-beige text-ink-muted hover:bg-paper-softgray dark:bg-paper-dark-surface dark:border-clay dark:text-ink-dark dark:hover:bg-paper-dark-surface shadow-sm active:scale-[0.96]`;

    case "tertiary":
      return `${baseStyles} h-11 px-3 bg-transparent border-none text-ink-muted hover:text-ink-light dark:text-stone dark:hover:text-ink-dark`;

    case "bare":
      return "inline-flex items-center justify-center font-sans font-medium text-ui-footnote hover:underline focus:underline transition-all";

    case "fab-action":
      return "inline-flex items-center gap-2 px-4 py-2 font-sans font-medium text-ui-footnote text-ink-muted dark:text-stone hover:text-ink-light dark:hover:text-ink-dark transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-sage disabled:opacity-30 disabled:pointer-events-none select-none";

    case "fab-toggle":
      return "inline-flex items-center justify-center px-4 py-2 font-sans font-medium text-ui-footnote border-l border-edge transition-all min-w-[48px] focus:outline-none focus-visible:ring-2 focus-visible:ring-sage disabled:opacity-30 disabled:pointer-events-none select-none";

    case "menu-item":
      return "w-full inline-flex items-center justify-start gap-3 px-3 py-2.5 font-sans font-medium text-ui-footnote text-ink-muted dark:text-stone hover:bg-paper-softgray dark:hover:bg-paper-dark-surface hover:text-ink-light dark:hover:text-ink-dark transition-all rounded-xl group focus:outline-none focus-visible:ring-2 focus-visible:ring-sage disabled:opacity-30 disabled:pointer-events-none select-none active:scale-[0.96]";

    case "pill-icon":
      return "flex items-center justify-center p-1 text-ink-muted hover:text-sage dark:text-stone dark:hover:text-sage transition-all duration-200 ease-out rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sage disabled:opacity-30 disabled:pointer-events-none select-none active:scale-[0.96]";

    default:
      return baseStyles;
  }
};
