"use client";

import React from "react";

interface ToggleProps {
  active: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

const Toggle = ({ active, onChange, label }: ToggleProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={active}
    aria-label={label}
    onClick={() => onChange(!active)}
    className={`
      relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent 
      transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20
      ${active ? 'bg-blue-600 dark:bg-blue-500' : 'bg-zinc-200 dark:bg-zinc-700'}
    `}
  >
    <span
      className={`
        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 
        transition duration-200 ease-in-out
        ${active ? 'translate-x-5' : 'translate-x-0'}
      `}
    />
  </button>
);

export default Toggle;
