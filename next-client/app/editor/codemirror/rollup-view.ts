import { type EditorSelection, type EditorState, type Range } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from "@codemirror/view";
import { REGEX_ROLLUP_END, REGEX_ROLLUP_START } from "@/app/utils/rollup/render";
import { parseRollupItem, parseSummary, type RollupSummary } from "@/app/utils/rollup/items";
import type { RollupKind } from "@/app/utils/rollup/period";
import { requestRollupItem } from "../utils/worklog-events";
import { hasRollupContextEffect, rollupContextField, type RollupContext } from "./rollup-context";

// How a rollup sheet's generated region reads in the editor (rollup sheets
// only, from rollupContextField):
// - the summary line (`12 done · 4 open · 1 blocked`) shows as a stat strip
//   with a done bar in the level colour;
// - Blocked and Still open items get a checkbox in place of the bullet that
//   checks the task off in its daily sheet (requestRollupItem "toggle");
// - item lines the last rebuild added are tinted for a moment.
// The caret on a line shows its Markdown as written, so everything stays
// editable.

const REGEX_SECTION = /^##\s+(.+?)\s*$/;
const CHECKABLE_SECTIONS = new Set(["blocked", "still open"]);
const freshLine = Decoration.line({ class: "cm-rollupFresh" });

export class RollupStatsWidget extends WidgetType {
  constructor(readonly summary: RollupSummary, readonly kind: RollupKind) {
    super();
  }

  eq(other: RollupStatsWidget) {
    const a = this.summary;
    const b = other.summary;
    return other.kind === this.kind && a.done === b.done && a.open === b.open && a.blocked === b.blocked;
  }

  toDOM() {
    const { done, open, blocked } = this.summary;
    const total = done + open + blocked;
    const strip = document.createElement("span");
    strip.className = "cm-rollupStats";
    strip.style.setProperty("--rollup-level", `var(--sheet-${this.kind})`);
    strip.setAttribute("aria-label", `${done} done, ${open} open, ${blocked} blocked`);
    const stat = (count: number, label: string, extra = "") => {
      const item = document.createElement("span");
      item.className = `cm-rollupStat ${extra}`;
      const value = document.createElement("strong");
      value.textContent = String(count);
      item.append(value, ` ${label}`);
      return item;
    };
    const bar = document.createElement("span");
    bar.className = "cm-rollupBar";
    bar.setAttribute("aria-hidden", "true");
    const fill = document.createElement("span");
    fill.className = "cm-rollupBarFill";
    fill.style.width = `${total ? Math.round((done / total) * 100) : 0}%`;
    bar.appendChild(fill);
    strip.append(stat(done, "done", "cm-rollupStat-done"), stat(open, "open"), stat(blocked, "blocked", blocked ? "cm-rollupStat-blocked" : ""), bar);
    return strip;
  }

  ignoreEvent() {
    return false;
  }
}

export class RollupCheckWidget extends WidgetType {
  constructor(readonly path: string, readonly line: string, readonly date: string) {
    super();
  }

  eq(other: RollupCheckWidget) {
    return other.path === this.path && other.line === this.line;
  }

  toDOM() {
    const box = document.createElement("span");
    box.className = "cm-rollupCheck";
    box.setAttribute("role", "checkbox");
    box.setAttribute("aria-checked", "false");
    box.setAttribute("aria-label", `Mark done in ${this.date}`);
    box.title = `Mark done in ${this.date}`;
    box.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      box.setAttribute("aria-checked", "true");
      requestRollupItem({ path: this.path, line: this.line, action: "toggle" });
    });
    return box;
  }

  // The box handles its own presses; the editor doesn't move the caret there.
  ignoreEvent() {
    return true;
  }
}

const touchesLine = (selection: EditorSelection | null, from: number, to: number) =>
  selection?.ranges.some((range) => range.to >= from && range.from <= to) ?? false;

export function buildRollupViewDecorations(state: EditorState, focused: boolean): DecorationSet {
  const context: RollupContext | null = state.field(rollupContextField, false) ?? null;
  if (!context) return Decoration.none;
  const ranges: Range<Decoration>[] = [];
  const selection = focused ? state.selection : null;
  const { doc } = state;
  let inRegion = false;
  let summaryNext = false;
  let section = "";
  for (let number = 1; number <= doc.lines; number++) {
    const line = doc.line(number);
    const text = line.text;
    if (!inRegion) {
      if (REGEX_ROLLUP_START.test(text)) {
        inRegion = true;
        summaryNext = true;
      }
      continue;
    }
    if (REGEX_ROLLUP_END.test(text)) {
      inRegion = false;
      section = "";
      continue;
    }
    const caretHere = touchesLine(selection, line.from, line.to);
    if (summaryNext) {
      summaryNext = false;
      const summary = parseSummary(text);
      if (summary && !caretHere) {
        ranges.push(Decoration.replace({ widget: new RollupStatsWidget(summary, context.kind) }).range(line.from, line.to));
        continue;
      }
    }
    const heading = REGEX_SECTION.exec(text);
    if (heading) {
      section = heading[1].toLowerCase();
      continue;
    }
    if (context.fresh.has(text.trim())) ranges.push(freshLine.range(line.from));
    if (CHECKABLE_SECTIONS.has(section) && !caretHere && text.startsWith("- ")) {
      const item = parseRollupItem(text);
      if (item) {
        ranges.push(Decoration.replace({ widget: new RollupCheckWidget(context.path, text, item.date) }).range(line.from, line.from + 2));
      }
    }
  }
  return Decoration.set(ranges, true);
}

const rollupViewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildRollupViewDecorations(view.state, view.hasFocus);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.focusChanged || hasRollupContextEffect(update.transactions)) {
        this.decorations = buildRollupViewDecorations(update.state, update.view.hasFocus);
      }
    }
  },
  { decorations: (value) => value.decorations },
);

const rollupViewTheme = EditorView.baseTheme({
  ".cm-rollupStats": {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.9em",
    fontSize: "0.85em",
    color: "var(--fg-muted)",
    fontVariantNumeric: "tabular-nums",
  },
  ".cm-rollupStat strong": { fontWeight: "600", color: "var(--fg)" },
  ".cm-rollupStat-done strong": { color: "var(--rollup-level)" },
  ".cm-rollupStat-blocked strong": { color: "var(--clay)" },
  ".cm-rollupBar": {
    display: "inline-block",
    width: "4.5em",
    height: "3px",
    borderRadius: "999px",
    background: "color-mix(in srgb, var(--rollup-level) 18%, transparent)",
    overflow: "hidden",
  },
  ".cm-rollupBarFill": {
    display: "block",
    height: "100%",
    borderRadius: "999px",
    background: "var(--rollup-level)",
    transition: "width 600ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
  ".cm-rollupCheck": {
    display: "inline-block",
    boxSizing: "border-box",
    width: "0.85em",
    height: "0.85em",
    marginRight: "0.5em",
    verticalAlign: "-0.08em",
    border: "1.5px solid var(--fg-faint)",
    borderRadius: "0.22em",
    cursor: "pointer",
    transition: "border-color 150ms, background-color 150ms",
  },
  ".cm-rollupCheck:hover": { borderColor: "var(--moss)" },
  ".cm-rollupCheck[aria-checked='true']": { borderColor: "var(--moss)", backgroundColor: "var(--moss)" },
  "@keyframes cm-rollupFresh": {
    from: { backgroundColor: "color-mix(in srgb, var(--moss) 16%, transparent)" },
    to: { backgroundColor: "transparent" },
  },
  ".cm-rollupFresh": { animation: "cm-rollupFresh 2.4s ease-out" },
  "@media (prefers-reduced-motion: reduce)": {
    ".cm-rollupFresh": { animation: "none" },
    ".cm-rollupBarFill": { transition: "none" },
  },
});

export const rollupView = [rollupContextField, rollupViewPlugin, rollupViewTheme];
