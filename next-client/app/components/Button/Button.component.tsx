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
        if ((rest.type || "button") !== "submit") {
          e.preventDefault();
        }
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
  "rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-30 disabled:pointer-events-none select-none border font-sans font-semibold text-ui-footnote sm:text-ui-subhead";

const variantStyles = (variant: ButtonVariant): string => {
  switch (variant) {
    case "hero":
      return `${baseStyles} h-12 px-8 bg-blue-600 text-white border-blue-600 hover:bg-blue-500 shadow-md active:scale-[0.97]`;

    case "primary":
      return `${baseStyles} h-11 px-6 bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-100 dark:hover:bg-zinc-200 shadow-sm active:scale-[0.97]`;

    case "warning":
      return `${baseStyles} h-11 px-6 bg-amber-500 text-white border-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:border-amber-600 dark:hover:bg-amber-700 shadow-sm active:scale-[0.97]`;

    case "secondary":
      return `${baseStyles} h-11 px-6 bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800 shadow-sm active:scale-[0.97]`;

    case "outlined":
      return `${baseStyles} h-11 px-4 bg-transparent border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/50 active:scale-[0.97]`;

    case "icon":
      return `${baseStyles} w-10 h-10 p-0 bg-transparent border-none text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full active:scale-[0.95]`;

    case "icon-bg":
      return `${baseStyles} w-10 h-10 p-0 bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm active:scale-[0.95]`;

    case "tertiary":
      return `${baseStyles} h-11 px-3 bg-transparent border-none text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100`;

    case "bare":
      return "inline-flex items-center justify-center font-sans font-medium text-ui-footnote hover:underline focus:underline transition-all";

    case "fab-action":
      return "inline-flex items-center gap-2 px-4 py-2 font-sans font-medium text-ui-footnote text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-30 disabled:pointer-events-none select-none";

    case "fab-toggle":
      return "inline-flex items-center justify-center px-4 py-2 font-sans font-medium text-ui-footnote border-l border-zinc-200 dark:border-zinc-800 transition-all min-w-[48px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-30 disabled:pointer-events-none select-none";

    case "menu-item":
      return "w-full inline-flex items-center justify-start gap-3 px-3 py-2.5 font-sans font-medium text-ui-footnote text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:bg-zinc-100 transition-all rounded-xl group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-30 disabled:pointer-events-none select-none";

    case "pill-icon":
      return "flex items-center justify-center p-1 text-zinc-400 hover:text-blue-600 dark:text-zinc-500 dark:hover:text-blue-400 transition-all duration-200 ease-out rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-30 disabled:pointer-events-none select-none active:scale-[0.95]";

    default:
      return baseStyles;
  }
};
