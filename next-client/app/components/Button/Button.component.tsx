import React, { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outlined" | "icon" | "tertiary" | "hero" | "bare";

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
        e.preventDefault();
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
  "rounded-lg flex items-center gap-2 justify-center transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none select-none border transform hover:scale-[1.03] active:scale-95 min-w-[44px] min-h-[44px]";

const variantStyles = (variant: ButtonVariant): string => {
  switch (variant) {
    case "hero": {
      const primaryClasses = `${baseStyles} bg-black text-white shadow hover:bg-neutral-900 focus:bg-neutral-900 focus-visible:ring-black dark:bg-white dark:text-black dark:border-black dark:hover:bg-neutral-100 dark:focus:bg-neutral-100 dark:focus-visible:ring-white`;
      return `${primaryClasses} h-16 px-8 text-xl shadow-lg`;
    }
    case "primary":
      return `${baseStyles} px-8 py-4 bg-black text-white shadow hover:bg-neutral-900 focus:bg-neutral-900 focus-visible:ring-black dark:bg-white dark:text-black dark:border-black dark:hover:text-white dark:focus:text-white dark:hover:bg-neutral-900 dark:focus:bg-neutral-900 dark:focus-visible:ring-white`;
    case "secondary":
      return `${baseStyles} px-8 py-4 bg-white text-black border-black shadow hover:bg-neutral-100 focus:bg-neutral-100 focus-visible:ring-black active:bg-neutral-200 dark:bg-neutral-800 dark:text-white dark:border-white dark:hover:bg-neutral-700 dark:hover:text-white dark:focus:bg-neutral-700 dark:focus:text-white dark:active:bg-neutral-700 dark:focus-visible:ring-white`;
    case "outlined":
      return `${baseStyles} px-4 py-2 bg-transparent border-black text-black shadow-none hover:bg-neutral-100 focus:bg-neutral-100 focus-visible:ring-black dark:text-white dark:border-white dark:hover:bg-neutral-700 dark:hover:text-white dark:focus:bg-neutral-700 dark:focus:text-white dark:focus-visible:ring-white`;
    case "icon":
      // Ensure icon buttons are at least 44x44px and centered
      return `${baseStyles} p-0 w-11 h-11 bg-transparent border-none text-black rounded-lg shadow-none flex items-center justify-center hover:text-neutral-600 hover:bg-neutral-100 focus:bg-neutral-100 active:bg-neutral-200 focus-visible:ring-black dark:text-white dark:hover:bg-neutral-700 dark:hover:text-white dark:focus:bg-neutral-700 dark:focus:text-white dark:focus-visible:ring-white dark:active:bg-neutral-700`;
    case "tertiary":
      return `${baseStyles} px-4 py-2 bg-transparent text-black border-none shadow-none hover:bg-neutral-100 focus:bg-neutral-100 focus-visible:underline dark:text-white dark:hover:bg-neutral-700 dark:hover:text-white dark:focus:bg-neutral-700 dark:focus:text-white dark:focus-visible:ring-white`;
    case "bare":
      return "min-w-[44px] min-h-[44px]";
    default:
      return baseStyles;
  }
};
