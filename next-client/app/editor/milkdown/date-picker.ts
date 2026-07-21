import type { Ctx } from "@milkdown/kit/ctx";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { $ctx, $prose } from "@milkdown/kit/utils";
import { REGEX_DATE_ISO, REGEX_DATE_SLASHED, REGEX_DATE_DOTTED, REGEX_DATE_WIKI } from "../components/regex";

type DateFormat = "iso" | "wiki" | "slashed" | "dotted";

interface DateTextMatch {
  start: number;
  end: number;
  format: DateFormat;
  date: Date;
}

function parseMatch(raw: string, format: DateFormat): Date | null {
  const dateStr = format === "wiki" ? raw.slice(2, -2) : raw;
  let date: Date;
  if (format === "iso" || format === "wiki") {
    date = new Date(dateStr);
  } else if (format === "slashed") {
    const [m, d, y] = dateStr.split("/").map(Number);
    date = new Date(y, m - 1, d);
  } else {
    const [d, m, y] = dateStr.split(".").map(Number);
    date = new Date(y, m - 1, d);
  }
  return isNaN(date.getTime()) ? null : date;
}

// Port of date-detection.ts's findDateAtPos, scanning a whole string
// instead of a window around one cursor position (a click already gives
// an exact offset, no need for the ±30-char search window that exists
// there to keep cursor-driven detection cheap).
function matchesFor(text: string): DateTextMatch[] {
  const matches: DateTextMatch[] = [];
  const scan = (regex: RegExp, format: DateFormat) => {
    for (const m of text.matchAll(regex)) {
      const date = parseMatch(m[0], format);
      if (date) matches.push({ start: m.index!, end: m.index! + m[0].length, format, date });
    }
  };
  scan(REGEX_DATE_WIKI, "wiki");
  scan(REGEX_DATE_ISO, "iso");
  scan(REGEX_DATE_SLASHED, "slashed");
  scan(REGEX_DATE_DOTTED, "dotted");
  // The ISO date inside "[[2026-07-21]]" also matches REGEX_DATE_ISO —
  // drop any non-wiki match whose range a wiki match already claims so it
  // isn't decorated/clickable twice.
  const wikiRanges = matches.filter((m) => m.format === "wiki");
  return matches.filter((m) => m.format === "wiki" || !wikiRanges.some((w) => m.start >= w.start && m.end <= w.end));
}

function formatDate(date: Date, format: DateFormat): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  if (format === "iso") return `${y}-${m}-${d}`;
  if (format === "wiki") return `[[${y}-${m}-${d}]]`;
  if (format === "slashed") return `${m}/${d}/${y}`;
  return `${d}.${m}.${y}`;
}

// Rendered view has no room for a raw-text buffer to splice, so the
// picked-date replacement is done here (inside the plugin, which knows
// the ProseMirror positions) rather than in React — React only supplies
// the calendar UI and hands back a plain Date via `onSelect`. Mirrors the
// wikilink/link click plugins' ctx-callback bridge pattern.
export const onDateClickCtx = $ctx<
  ((payload: { date: Date; onSelect: (date: Date) => void }) => void) | undefined,
  "onDateClick"
>(undefined, "onDateClick");

export function configureDateClick(
  ctx: Ctx,
  onDateClick?: (payload: { date: Date; onSelect: (date: Date) => void }) => void,
) {
  ctx.set(onDateClickCtx.key, onDateClick);
}

// Port of the Source editor's date detection/formatting (date-detection.ts,
// use-codemirror-features.ts's handleDateSelect) — recognizes the same
// ISO/slashed/dotted/wiki formats and reformats a picked date back into
// whichever one was clicked. Source mode opens the picker via a
// cursor-driven pill + Alt+Down; Rendered mode is simpler to drive by
// direct click, since there's no raw-text cursor position to hook into.
export const dateClickPlugin = $prose((ctx) => {
  return new Plugin({
    key: new PluginKey("DATE_TEXT"),
    props: {
      decorations(state) {
        const decos: Decoration[] = [];
        state.doc.descendants((node, pos) => {
          if (!node.isText || !node.text) return;
          for (const m of matchesFor(node.text)) {
            decos.push(
              Decoration.inline(pos + m.start, pos + m.end, {
                class: "cursor-pointer underline decoration-dotted underline-offset-4 decoration-clay/60",
              }),
            );
          }
        });
        return DecorationSet.create(state.doc, decos);
      },
      handleClick(view, pos) {
        const onDateClick = ctx.get(onDateClickCtx.key);
        if (!onDateClick) return false;

        const $pos = view.state.doc.resolve(pos);
        const text = $pos.parent.textContent;
        const offset = $pos.parentOffset;
        const match = matchesFor(text).find((m) => offset >= m.start && offset <= m.end);
        if (!match) return false;

        const parentStart = $pos.start();
        const from = parentStart + match.start;
        const to = parentStart + match.end;

        onDateClick({
          date: match.date,
          onSelect: (newDate: Date) => {
            view.dispatch(view.state.tr.insertText(formatDate(newDate, match.format), from, to));
            view.focus();
          },
        });
        return true;
      },
    },
  });
});
