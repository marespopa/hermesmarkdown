import React from "react";

// The one look for a count anywhere in the app: tags and task groups in
// listings, the Tasks header and tabs, the editor's word count. Small,
// tabular, faint, with thousands separators ("1,204"). `floating` is the
// same text on the page's own colour (no border, no chip), for one that sits
// over content, so text under it never shows through.
const INLINE_CLASS = "shrink-0 text-ui-caption font-normal tabular-nums text-fg-faint";
const FLOATING_CLASS = "rounded-md bg-surface px-1.5 py-0.5 text-ui-caption font-normal tabular-nums text-fg-faint";

type Props = Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> & {
  count: number;
  /** Words after the number, singular and plural: ["word", "words"]. */
  unit?: [string, string];
  variant?: "inline" | "floating";
};

export function formatCount(count: number, unit?: [string, string]): string {
  const number = count.toLocaleString("en-US");
  return unit ? `${number} ${count === 1 ? unit[0] : unit[1]}` : number;
}

export default function CountBadge({ count, unit, variant = "inline", className = "", ...rest }: Props) {
  return (
    <span {...rest} className={`${variant === "floating" ? FLOATING_CLASS : INLINE_CLASS} ${className}`}>
      {formatCount(count, unit)}
    </span>
  );
}
