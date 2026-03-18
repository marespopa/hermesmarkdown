import React, { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outlined" | "icon" | "icon-bg" | "tertiary" | "hero" | "bare";

type Props = {
  children?: ReactNode;
  variant: ButtonVariant;
  label?: string | ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  styles?: string;
  isDisabled?: boolean;
  [key: string]: any; 
};

export default function Button({
  variant,
  label,
  children,
  styles = "",
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
      className={`${variantStyles(variant)} ${styles}`}
      disabled={isDisabled}
      {...rest}
    >
      {children || label}
    </button>
  );
}

// Minimalistic Base: Removed transform/scaling for a more stable "Pro" feel
const baseStyles =
  "rounded-md flex items-center justify-center gap-2 transition-all duration-150 ease-out focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:opacity-30 disabled:pointer-events-none select-none border font-mono text-[12px] lowercase tracking-tight";

const variantStyles = (variant: ButtonVariant): string => {
  switch (variant) {
    case "hero":
      // High contrast, clean
      return `${baseStyles} h-12 px-8 bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-100 dark:hover:bg-zinc-200 shadow-sm`;

    case "primary":
      // Solid neutral
      return `${baseStyles} h-9 px-6 bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-100 dark:hover:bg-zinc-200`;

    case "secondary":
      // Muted fill
      return `${baseStyles} h-9 px-6 bg-zinc-100 text-zinc-900 border-zinc-200 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-700`;

    case "outlined":
      // Ghost style with border
      return `${baseStyles} h-9 px-4 bg-transparent border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/50`;

    case "icon":
      // Pure icon, no border
      return `${baseStyles} w-9 h-9 p-0 bg-transparent border-none text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800`;

    case "icon-bg":
      // Subtle container for icons
      return `${baseStyles} w-9 h-9 p-0 bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700`;

    case "tertiary":
      // Text only
      return `${baseStyles} h-9 px-3 bg-transparent border-none text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100`;

    case "bare":
      return "inline-flex items-center justify-center font-mono text-[12px] lowercase";

    default:
      return baseStyles;
  }
};
