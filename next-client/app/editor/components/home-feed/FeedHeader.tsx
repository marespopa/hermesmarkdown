"use client";

import type { ReactNode } from "react";
import { greeting } from "./greetings";

interface FeedHeaderProps {
  now: Date;
  /** From the welcome wizard's name step; the greeting goes without a name when empty. */
  userName?: string;
  /** Shown under the title row (the week strip). */
  children?: ReactNode;
}

// "Good morning, Ada!" above today's weekday (large, with an accent dot);
// month and day on the right; the week strip, when given, below.
export default function FeedHeader({ now, userName = "", children }: FeedHeaderProps) {
  const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
  const monthDay = now.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  return (
    <header className="pb-8 pt-16 sm:pt-24">
      <p className="mb-1 text-ui-callout text-fg-muted">{greeting(now, userName)}</p>
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="flex items-baseline gap-2 text-ui-title-1 font-semibold tracking-tight text-fg sm:text-[2.5rem] sm:leading-[3rem]">
          {weekday}
          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-accent" />
        </h1>
        <p className="text-ui-callout text-fg-muted">{monthDay}</p>
      </div>
      {children}
    </header>
  );
}
