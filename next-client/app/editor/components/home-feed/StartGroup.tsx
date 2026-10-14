"use client";

import { useId, type ReactNode } from "react";
import { HiChevronRight } from "react-icons/hi";
import Button from "@/app/components/Button";

interface StartGroupProps {
  /** Small caption above the card; also names the group for screen readers. */
  title?: string;
  /** Small muted line under the card. */
  footer?: ReactNode;
  children: ReactNode;
}

// An inset grouped list, as in iOS Settings: a caption, a rounded card of
// rows split by hairlines that start where the text does, and an optional
// footnote under it.
export function StartGroup({ title, footer, children }: StartGroupProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={title ? titleId : undefined} className="flex w-full flex-col">
      {title && (
        <h2 id={titleId} className="px-4 pb-1.5 text-ui-footnote text-fg-muted">
          {title}
        </h2>
      )}
      <ul className="overflow-hidden rounded-2xl border border-edge-subtle bg-surface-raised">{children}</ul>
      {footer && <p className="px-4 pt-1.5 text-ui-footnote text-fg-muted">{footer}</p>}
    </section>
  );
}

// The hairline above every row but the first, inset to the text column.
export const ROW_DIVIDER = "border-t border-edge-subtle group-first/row:border-t-0";

// A row's icon: a small rounded tile, tinted like an iOS Settings glyph.
export function StartIcon({ tone = "neutral", children }: { tone?: "accent" | "sage" | "neutral"; children: ReactNode }) {
  const tones = { accent: "bg-accent text-white", sage: "bg-sage text-white", neutral: "bg-surface text-fg-muted" };
  return (
    <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
      {children}
    </span>
  );
}

interface StartRowProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onClick: () => void;
  /** Hides the chevron, for a row that carries its own trailing control. */
  trailing?: ReactNode;
}

// One tappable row: icon tile, title over a muted subtitle, chevron. The
// button's name is the title alone; the subtitle describes it.
export function StartRow({ icon, title, subtitle, onClick, trailing }: StartRowProps) {
  const subtitleId = useId();
  return (
    <li className="group/row relative">
      <Button
        variant="unstyled"
        onClick={onClick}
        aria-label={title}
        aria-describedby={subtitle ? subtitleId : undefined}
        className="flex w-full min-w-0 items-center gap-3 pl-4 text-left transition-colors hover:bg-edge-subtle focus-visible:bg-edge-subtle"
      >
        {icon}
        <span className={`flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-4 ${ROW_DIVIDER}`}>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-ui-body text-fg">{title}</span>
            {subtitle && (
              <span id={subtitleId} className="truncate text-ui-footnote text-fg-muted">
                {subtitle}
              </span>
            )}
          </span>
          {trailing === undefined ? <HiChevronRight size={18} aria-hidden="true" className="shrink-0 text-fg-faint" /> : <span className="w-7 shrink-0" />}
        </span>
      </Button>
      {trailing}
    </li>
  );
}
