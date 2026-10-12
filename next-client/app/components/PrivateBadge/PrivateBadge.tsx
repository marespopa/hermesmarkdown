import React from "react";
import { HiOutlineLockClosed } from "react-icons/hi";

interface PrivateBadgeProps {
  className?: string;
}

// Small lock marking a note (or a task from one) as private in listings.
export default function PrivateBadge({ className = "" }: PrivateBadgeProps) {
  return (
    <span role="img" aria-label="Private note" className={`inline-flex shrink-0 text-fg-faint ${className}`}>
      <HiOutlineLockClosed size={14} aria-hidden="true" />
    </span>
  );
}
