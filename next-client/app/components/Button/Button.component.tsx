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
  "rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-30 disabled:pointer-events-none select-none border font-sans font-semibold text-ui-footnote sm:text-ui-subhead";

// `accent-hover`/`accent` resolve to the same CSS var, so solid buttons lean on
// brightness + elevation (not a color swap) to read as "pressable" on hover.
const solidLift =
  "shadow-sm hover:shadow-md hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] active:shadow-sm";
const surfaceLift =
  "shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] active:shadow-sm";

const variantStyles = (variant: ButtonVariant): string => {
  switch (variant) {
    case "hero":
      return `${baseStyles} h-12 px-8 bg-accent text-white border-accent hover:bg-accent-hover ${solidLift}`;

    case "primary":
      return `${baseStyles} h-11 px-6 bg-sage border-sage text-white hover:bg-sage-hover hover:border-sage-hover ${solidLift}`;

    case "warning":
      return `${baseStyles} h-11 px-6 bg-amber-500 text-white border-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:border-amber-600 dark:hover:bg-amber-700 ${solidLift}`;

    case "secondary":
      return `${baseStyles} h-11 px-6 bg-paper-light text-ink-light border-beige hover:bg-paper-softgray hover:border-stone dark:bg-paper-dark-surface dark:text-ink-dark dark:border-clay dark:hover:bg-paper-dark-surface ${surfaceLift}`;

    case "outlined":
      return `${baseStyles} h-11 px-4 bg-transparent border-beige text-ink-muted hover:bg-paper-softgray hover:border-stone hover:text-ink-light dark:border-clay dark:text-stone dark:hover:bg-paper-dark-surface/50 dark:hover:text-ink-dark active:scale-[0.98]`;

    case "icon":
      return `${baseStyles} w-10 h-10 p-0 bg-transparent border-none text-ink-muted hover:text-ink-light dark:text-stone dark:hover:text-ink-dark hover:bg-paper-softgray dark:hover:bg-paper-dark-surface hover:scale-105 rounded-full active:scale-95`;

    case "icon-bg":
      return `${baseStyles} w-10 h-10 p-0 bg-paper-light border-beige text-ink-muted hover:bg-paper-softgray hover:border-stone hover:text-ink-light dark:bg-paper-dark-surface dark:border-clay dark:text-ink-dark dark:hover:bg-paper-dark-surface ${surfaceLift} hover:scale-105 active:scale-95`;

    case "tertiary":
      return `${baseStyles} h-11 px-3 bg-transparent border-none text-ink-muted hover:text-ink-light dark:text-stone dark:hover:text-ink-dark`;

    case "bare":
      return "inline-flex items-center justify-center font-sans font-medium text-ui-footnote hover:underline focus:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded transition-all duration-200 ease-out";

    case "fab-action":
      return "inline-flex items-center gap-2 px-4 py-2 font-sans font-medium text-ui-footnote text-ink-muted dark:text-stone hover:text-ink-light dark:hover:text-ink-dark transition-all duration-200 ease-out group focus:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded-lg disabled:opacity-30 disabled:pointer-events-none select-none active:scale-95";

    case "fab-toggle":
      return "inline-flex items-center justify-center px-4 py-2 font-sans font-medium text-ui-footnote border-l border-edge transition-all duration-200 ease-out min-w-[48px] hover:bg-paper-softgray dark:hover:bg-paper-dark-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-30 disabled:pointer-events-none select-none active:scale-95";

    case "menu-item":
      return "w-full inline-flex items-center justify-start gap-3 px-3 py-2.5 font-sans font-medium text-ui-footnote text-ink-muted dark:text-stone hover:bg-paper-softgray dark:hover:bg-paper-dark-surface hover:text-ink-light dark:hover:text-ink-dark transition-all duration-200 ease-out rounded-xl group focus:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-30 disabled:pointer-events-none select-none active:scale-[0.97]";

    case "pill-icon":
      return "flex items-center justify-center p-1 text-ink-muted hover:text-sage hover:scale-110 dark:text-stone dark:hover:text-sage transition-all duration-200 ease-out rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-30 disabled:pointer-events-none select-none active:scale-95";

    default:
      return baseStyles;
  }
};
