"use client";

interface FeedHeaderProps {
  now: Date;
  /** From the welcome wizard's name step; the greeting is left out when empty. */
  userName?: string;
}

// "Welcome, <name>!" above today's weekday (large, with an accent dot);
// month and day on the right.
export default function FeedHeader({ now, userName = "" }: FeedHeaderProps) {
  const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
  const monthDay = now.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  const name = userName.trim();
  return (
    <header className="pb-8 pt-16 sm:pt-24">
      {name && <p className="mb-1 text-ui-callout text-fg-muted">Welcome, {name}!</p>}
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="flex items-baseline gap-2 text-ui-title-1 font-semibold tracking-tight text-fg sm:text-[2.5rem] sm:leading-[3rem]">
          {weekday}
          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-accent" />
        </h1>
        <p className="text-ui-callout text-fg-muted">{monthDay}</p>
      </div>
    </header>
  );
}
