"use client";

import type { ReactNode } from "react";

interface FeedWelcomeProps {
  icon: ReactNode;
  title: string;
  message: string;
  /** Under the message: the card's main action. */
  action?: ReactNode;
}

// The card that opens an empty feed (no vault, or a vault with no notes):
// an accent icon tile, a short headline and one line of reassurance over
// two soft colour washes, then an optional action.
export default function FeedWelcome({ icon, title, message, action }: FeedWelcomeProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-edge-subtle bg-surface-raised px-6 py-8 sm:px-8 sm:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[color:color-mix(in_srgb,var(--clay)_16%,transparent)] blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-[color:color-mix(in_srgb,var(--moss)_14%,transparent)] blur-3xl" />
      <div className="relative flex flex-col items-start gap-3">
        <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-white shadow-sm">
          {icon}
        </span>
        <h2 className="text-ui-title-3 font-semibold tracking-tight text-fg">{title}</h2>
        <p className="max-w-md text-ui-body text-fg-muted">{message}</p>
        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  );
}
