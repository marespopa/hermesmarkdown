import React, { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "info";

type Props = {
  children?: ReactNode;
  variant: ButtonVariant;
  label?: string | ReactNode;
  handler: () => void;
  styles?: string;
  isDisabled?: boolean;
  [key: string]: any; // Allow extra props like data-testid
};

export default function Button({
  variant,
  label,
  children,
  handler,
  styles = "",
  isDisabled = false,
  ...rest
}: Props) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        handler();
      }}
      className={`${variantStyles(variant)} ${styles}`}
      disabled={isDisabled}
      {...rest}
    >
      <span className="flex gap-2 items-center">{children || label}</span>
    </button>
  );
}

const variantStyles = (variant: ButtonVariant) => {
  const baseStyles = `rounded-lg shadow-md px-4 py-2 text-lg font-medium transition-all duration-200 ease-in-out focus:scale-105 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2`;
  const disabledStyles = `disabled:opacity-50 disabled:pointer-events-none`;

  switch (variant) {
    case "primary":
      return `${baseStyles} bg-emerald-600 text-white hover:bg-emerald-700 focus:bg-emerald-700 focus:ring-emerald-500 ${disabledStyles}`;
    case "secondary":
      return `${baseStyles} bg-gray-800 dark:bg-gray-600 text-white hover:bg-gray-700 dark:hover:bg-gray-500 focus:bg-gray-700 dark:focus:bg-gray-500 focus:ring-gray-500 dark:focus:ring-gray-400 ${disabledStyles}`;
    case "danger":
      return `${baseStyles} bg-red-600 text-white hover:bg-red-700 focus:bg-red-700 focus:ring-red-500 ${disabledStyles}`;
    case "info":
      return `${baseStyles} bg-sky-800 text-white hover:bg-sky-900 focus:bg-sky-900 focus:ring-sky-800 ${disabledStyles}`;
    case "success":
      return `${baseStyles} bg-emerald-600 text-white hover:bg-emerald-700 focus:bg-emerald-700 focus:ring-emerald-500 ${disabledStyles}`;
    default:
      return `${baseStyles} bg-gray-200 text-black hover:bg-gray-300 focus:bg-gray-300 ${disabledStyles}`;
  }
};
