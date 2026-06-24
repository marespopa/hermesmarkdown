"use client";

import React from "react";

interface ToggleProps {
  active: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  variant?: "default" | "soft";
}

const trackStyles: Record<"default" | "soft", { on: string; off: string }> = {
  default: {
    on:  "bg-sage",
    off: "bg-paper-softgray dark:bg-clay",
  },
  soft: {
    on:  "bg-sage",
    off: "bg-neutral-300 dark:bg-neutral-600",
  },
};

const Toggle = ({ active, onChange, label, variant = "default" }: ToggleProps) => {
  const track = trackStyles[variant];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      onClick={() => onChange(!active)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-4 focus-visible:ring-sage/20
        ${active ? track.on : track.off}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white ring-0
          transition duration-200 ease-in-out
          ${active ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
};

export default Toggle;
