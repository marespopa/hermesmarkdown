import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { foldEffect, unfoldEffect, foldedRanges } from "@codemirror/language";
import { EditorState, type Range } from "@codemirror/state";

// Step 8 rewrite (not a port): the old utils/callout-folding.ts stripped
// collapsed callout bodies out of the textarea's VALUE ITSELF and manually
// remapped every caret offset across the hide/show boundary — a workaround
// for the textarea having no concept of "hidden but present" text. CM6's
// fold service is a real view-layer decoration: the text stays in the
// document, cursor/selection math just works across it natively, and
// toggling is two effect dispatches instead of a text-mutation-and-remap
// dance. This file only needs to find the ranges; CM6 does the rest.

const REGEX_OBSIDIAN_CALLOUT = /^(>\s*)+\[!(\w+)\]([+-]?)\s*(.*)$/i;
const REGEX_QUOTE_DEPTH = /^(>\s*)+/;

export interface CalloutFoldRange {
  blockId: string;
  titleOffset: number;
  bodyFrom: number;
  bodyTo: number;
  initiallyCollapsed: boolean;
}

// Scans the doc for Obsidian callouts and returns each one's title-line
// offset plus its body's foldable range (from just after the title line's
// newline, to the last body line). blockId is `${titleLineIndex}:${type}`.
export function findCalloutFoldRanges(doc: string): CalloutFoldRange[] {
  const lines = doc.split("\n");
  const lineStarts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    lineStarts.push(offset);
    offset += line.length + 1;
  }

  const results: CalloutFoldRange[] = [];
  let inCallout = false;
  let calloutDepth = 0;
  let blockId = "";
  let titleOffset = -1;
  let bodyFrom = -1;
  let bodyEnd = -1;
  let initiallyCollapsed = false;

  const flush = () => {
    if (inCallout && bodyFrom !== -1 && bodyEnd > bodyFrom) {
      results.push({
        blockId,
        titleOffset,
        bodyFrom,
        bodyTo: Math.min(bodyEnd, doc.length),
        initiallyCollapsed,
      });
    }
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    if (inCallout) {
      const depthMatch = line.match(REGEX_QUOTE_DEPTH);
      const lineDepth = depthMatch ? (depthMatch[0].match(/>/g) || []).length : 0;
      const stillInBody = lineDepth >= calloutDepth && line.trim() !== "";
      if (stillInBody) {
        bodyEnd = lineStarts[idx] + line.length;
        continue;
      }
      flush();
      inCallout = false;
    }

    const m = line.match(REGEX_OBSIDIAN_CALLOUT);
    if (m) {
      const depthMatch = line.match(REGEX_QUOTE_DEPTH)!;
      const depth = (depthMatch[0].match(/>/g) || []).length;
      const requestedType = m[2].toLowerCase();
      const fold = m[3];

      inCallout = true;
      calloutDepth = depth;
      blockId = `${idx}:${requestedType}`;
      titleOffset = lineStarts[idx];
      initiallyCollapsed = fold === "-";
      // Body starts at the title line's own trailing newline (not after it),
      // so folding swallows that newline too. That attaches the (invisible)
      // fold placeholder to the end of the title's own line instead of
      // giving it a separate, visually blank row of its own.
      bodyFrom = lineStarts[idx] + line.length;
      bodyEnd = -1;
    }
  }
  flush();

  return results;
}

export function toggleCalloutFold(view: EditorView, bodyFrom: number, bodyTo: number, collapse: boolean) {
  view.dispatch({
    effects: collapse ? foldEffect.of({ from: bodyFrom, to: bodyTo }) : unfoldEffect.of({ from: bodyFrom, to: bodyTo }),
  });
}

const REGEX_CALLOUT_SIGN = /^((?:>\s*)+\[!\w+\])([+-]?)/;

// Writes a callout's fold sign into its title line: `-` (collapsed) or `+`
// (expanded), as Obsidian reads them, so the fold state is saved with the
// note. Returns false when the line isn't a callout title or already says so.
export function setCalloutFoldSign(view: EditorView, titleOffset: number, collapsed: boolean): boolean {
  const line = view.state.doc.lineAt(titleOffset);
  const match = REGEX_CALLOUT_SIGN.exec(line.text);
  if (!match) return false;
  const sign = collapsed ? "-" : "+";
  if (match[2] === sign) return false;
  const from = line.from + match[1].length;
  view.dispatch({
    changes: { from, to: from + match[2].length, insert: sign },
    userEvent: "input.callout.fold",
  });
  return true;
}

export function isRangeFolded(state: EditorState, from: number, to: number): boolean {
  let found = false;
  foldedRanges(state).between(from, to, (rFrom, rTo) => {
    if (rFrom <= from && rTo >= to) found = true;
  });
  return found;
}

// A collapsed callout shows only its title line, but the card's bottom
// corners (`cm-callout-end`, highlight.ts) sit on its last body line, which
// is folded away. This marks a folded callout's title line as the card's end
// too, so the collapsed card keeps rounded bottom corners.
const collapsedCalloutEnd = Decoration.line({ class: "cm-callout-end" });

export function collapsedCalloutDecorations(state: EditorState): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  foldedRanges(state).between(0, state.doc.length, (from) => {
    const line = state.doc.lineAt(from);
    if (from === line.to && REGEX_OBSIDIAN_CALLOUT.test(line.text)) ranges.push(collapsedCalloutEnd.range(line.from));
  });
  return Decoration.set(ranges, true);
}

export const collapsedCalloutCorners = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = collapsedCalloutDecorations(view.state);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || foldedRanges(update.startState) !== foldedRanges(update.state)) {
        this.decorations = collapsedCalloutDecorations(update.state);
      }
    }
  },
  { decorations: (value) => value.decorations },
);
