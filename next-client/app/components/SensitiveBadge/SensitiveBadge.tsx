import React from "react";
import { HiOutlineLockClosed } from "react-icons/hi";

interface SensitiveBadgeProps {
  className?: string;
}

// Small lock marking a note (or a task from one) as sensitive in listings.
export default function SensitiveBadge({ className = "" }: SensitiveBadgeProps) {
  return (
    <span role="img" aria-label="Sensitive note" className={`inline-flex shrink-0 text-fg-faint ${className}`}>
      <HiOutlineLockClosed size={14} aria-hidden="true" />
    </span>
  );
}
