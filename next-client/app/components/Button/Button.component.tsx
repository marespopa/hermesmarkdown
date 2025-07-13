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
      className={`${styles} ${variantStyles(variant)}`}
      disabled={isDisabled}
      {...rest}
    >
      <span className="flex gap-2 items-center">{children || label}</span>
    </button>
  );
}

const variantStyles = (variant: ButtonVariant) => {
  const baseStyles = `bg-white text-black border border-black rounded-none font-mono font-bold px-4 py-2 text-lg focus:outline-none disabled:opacity-50 disabled:pointer-events-none hover:bg-gray-900 hover:text-white focus:ring-2 focus:ring-emerald-600 transition-colors`;

  switch (variant) {
    default:
      return baseStyles;
  }
};
