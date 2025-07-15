import React from "react";

type Props = {
  alt: string;
  tooltip: string;
  size?: number;
  className?: string;
};

export default function PenIcon({ alt, tooltip, size = 16, className = "" }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label={alt}
      className={`text-neutral-700 dark:text-neutral-200 ${className}`}
    >
      <title>{tooltip}</title>
      <path d="M7.127 22.562l-7.127 1.438 1.438-7.128 5.689 5.69zm1.414-1.414l11.228-11.225-5.69-5.692-11.227 11.227 5.689 5.69zm9.768-21.148l-2.816 2.817 5.691 5.691 2.816-2.819-5.691-5.689z" />
    </svg>
  );
}
