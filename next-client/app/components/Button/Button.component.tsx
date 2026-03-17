import React, { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outlined" | "icon" | "icon-bg" | "tertiary" | "hero" | "bare";

type Props = {
  children?: ReactNode;
  variant: ButtonVariant;
  label?: string | ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  styles?: string;
  isDisabled?: boolean;
  [key: string]: any; // Allow extra props like data-testid
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
        // Only prevent default for non-submit buttons
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

const baseStyles =
  "rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none select-none border transform hover:scale-[1.03] active:scale-95 min-w-[44px] min-h-[44px]";

const variantStyles = (variant: ButtonVariant): string => {
  switch (variant) {
    case "hero": {
      const primaryClasses = `${baseStyles} bg-sky-600 text-white border-sky-700 shadow-lg shadow-sky-900/20 hover:bg-sky-700 focus-visible:ring-sky-500 dark:bg-sky-500 dark:text-gray-950 dark:border-sky-400 dark:hover:bg-sky-400`;
      return `${primaryClasses} h-16 px-8 text-xl`;
    }

    case "primary":
      // Light: Trusted Blue | Dark: Vibrant Sky
      return `${baseStyles} px-8 py-4 bg-sky-600 text-white border-sky-700 shadow-sm hover:bg-sky-700 focus-visible:ring-sky-500 dark:bg-sky-500 dark:text-gray-950 dark:border-sky-400 dark:hover:bg-sky-400`;

    case "secondary":
      // Light: Soft Sky tint | Dark: Muted charcoal with sky border
      return `${baseStyles} px-8 py-4 bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100 focus-visible:ring-sky-500 dark:bg-zinc-800/50 dark:text-sky-200 dark:border-sky-900/50 dark:hover:bg-zinc-800`;

    case "outlined":
      return `${baseStyles} px-4 py-2 bg-transparent border-sky-600 text-sky-700 hover:bg-sky-50 focus-visible:ring-sky-500 dark:text-sky-400 dark:border-sky-500/40 dark:hover:bg-sky-500/10`;

    case "icon":
      return `${baseStyles} p-0 w-11 h-11 bg-transparent border-none text-sky-900 hover:bg-sky-200/50 focus-visible:ring-sky-500 dark:text-sky-200 dark:hover:bg-white/5`;

    case "icon-bg":
      // Glass-style Sky (No halo effect)
      return `${baseStyles} p-0 w-11 h-11 bg-sky-200/40 border-sky-300/30 text-sky-800 shadow-none hover:bg-sky-200 focus-visible:ring-sky-500 dark:bg-sky-500/10 dark:border-sky-500/20 dark:text-sky-400 dark:hover:bg-sky-500/20`;

    case "tertiary":
      return `${baseStyles} px-4 py-2 bg-transparent text-sky-800 border-none hover:bg-sky-200/40 focus-visible:ring-sky-500 dark:text-sky-300 dark:hover:bg-white/5`;

    case "bare":
      return "inline-flex items-center justify-center min-w-[44px] min-h-[44px]";

    default:
      return baseStyles;
  }
};
