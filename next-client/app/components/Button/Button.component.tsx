import React, { ReactNode } from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outlined"
  | "icon"
  | "icon-bg"
  | "tertiary"
  | "hero"
  | "bare"
  | "fab-action"
  | "fab-toggle"
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

// Minimalistic Base: Removed transform/scaling for a more stable "Pro" feel
const baseStyles =
  "rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-30 disabled:pointer-events-none select-none border font-sans font-semibold text-[13px] sm:text-[14px]";

const variantStyles = (variant: ButtonVariant): string => {
  switch (variant) {
    case "hero":
      return `${baseStyles} h-12 px-8 bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-100 dark:hover:bg-zinc-200 shadow-md active:scale-[0.98]`;

    case "primary":
      return `${baseStyles} h-11 px-6 bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-100 dark:hover:bg-zinc-200 shadow-sm active:scale-[0.98]`;

    case "secondary":
      return `${baseStyles} h-11 px-6 bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800 shadow-sm active:scale-[0.98]`;

    case "outlined":
      return `${baseStyles} h-11 px-4 bg-transparent border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/50 active:scale-[0.98]`;

    case "icon":
      return `${baseStyles} w-10 h-10 p-0 bg-transparent border-none text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full`;

    case "icon-bg":
      return `${baseStyles} w-10 h-10 p-0 bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm active:scale-[0.98]`;

    case "tertiary":
      return `${baseStyles} h-11 px-3 bg-transparent border-none text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100`;

    case "bare":
      return "inline-flex items-center justify-center font-sans font-medium text-[13px] hover:underline focus:underline transition-all";

    case "fab-action":
      return "inline-flex items-center gap-2 px-4 py-2 font-sans font-medium text-[13px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-30 disabled:pointer-events-none select-none";

    case "fab-toggle":
      return "inline-flex items-center justify-center px-4 py-2 font-sans font-medium text-[13px] border-l border-zinc-200 dark:border-zinc-800 transition-all min-w-[48px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-30 disabled:pointer-events-none select-none";

    case "menu-item":
      return "w-full inline-flex items-center justify-start gap-3 px-3 py-2.5 font-sans font-medium text-[13px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all rounded-xl group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-30 disabled:pointer-events-none select-none";

    default:
      return baseStyles;
  }
};
