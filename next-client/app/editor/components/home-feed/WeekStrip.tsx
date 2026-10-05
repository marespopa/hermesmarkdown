"use client";

import Button from "@/app/components/Button";
import type { WeekDay } from "./feed-model";

interface WeekStripProps {
  days: WeekDay[];
  now: Date;
  /** Local midnight of the selected row's day, highlighted in the strip. */
  activeDay?: number | null;
  /** Jumps to a feed row (the day's first note). */
  onJump: (index: number) => void;
}

function startOfToday(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

// The seven days ending today: weekday initial, date, and a dot on days with
// notes. A day with notes jumps the feed to its first row; empty days are
// dimmed and inert.
export default function WeekStrip({ days, now, activeDay = null, onJump }: WeekStripProps) {
  const today = startOfToday(now);
  return (
    <nav aria-label="Last 7 days" className="mt-6 grid grid-cols-7 gap-1">
      {days.map(({ day, count, firstIndex }) => {
        const date = new Date(day);
        const isToday = day === today;
        const isActive = day === activeDay;
        const hasNotes = count > 0;
        const fullDate = date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
        return (
          <Button
            key={day}
            variant="unstyled"
            isDisabled={!hasNotes}
            onClick={() => onJump(firstIndex)}
            aria-label={`${fullDate}, ${count} ${count === 1 ? "note" : "notes"}`}
            aria-current={isToday ? "date" : undefined}
            className={`flex flex-col items-center gap-1 rounded-lg py-2 transition-colors disabled:opacity-40 ${
              isActive ? "bg-surface-raised" : "hover:bg-surface-raised"
            }`}
          >
            <span aria-hidden="true" className="text-ui-caption text-fg-muted">
              {date.toLocaleDateString(undefined, { weekday: "narrow" })}
            </span>
            <span aria-hidden="true" className={`text-ui-callout font-medium ${isToday ? "text-accent" : "text-fg"}`}>
              {date.getDate()}
            </span>
            <span
              aria-hidden="true"
              className={`h-1 w-1 rounded-full ${hasNotes ? (isToday ? "bg-accent" : "bg-fg-muted") : "bg-transparent"}`}
            />
          </Button>
        );
      })}
    </nav>
  );
}
