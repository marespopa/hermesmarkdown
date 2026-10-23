"use client";

import React from "react";
import Button from "@/app/components/Button/Button.component";

interface ToggleProps {
  active: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  variant?: "default" | "soft";
}

// An iOS switch: the accent when on, the strongest gray control fill when
// off, a white knob with a soft shadow. Both variants share the look now;
// `soft` stays accepted for existing callers.
const trackStyles: Record<"default" | "soft", { on: string; off: string }> = {
  default: { on: "bg-sage", off: "bg-fill-press" },
  soft: { on: "bg-sage", off: "bg-fill-press" },
};

const Toggle = ({ active, onChange, label, variant = "default" }: ToggleProps) => {
  const track = trackStyles[variant];
  return (
    <Button
      variant="unstyled"
      role="switch"
      aria-checked={active}
      aria-label={label}
      onClick={() => onChange(!active)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out
        ${active ? track.on : track.off}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] ring-0
          transition duration-200 ease-in-out
          ${active ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </Button>
  );
};

export default Toggle;
