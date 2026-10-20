import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import type { EditorState, Range, Text } from "@codemirror/state";
import { findDetailsBlocks, REGEX_DETAILS_OPEN_ATTR, type DetailsBlock } from "@/app/utils/details-blocks";
import { FADED } from "./highlight-inline";
import { activeLines } from "./syntax-reveal";

// Raw HTML `<details><summary>` sections fold like callouts: the header line
// (the summary's line) stays, the rest through `</details>` folds away. The
// scanner is shared with the exports (utils/details-blocks.ts); the fold
// itself reuses callout-fold.ts's effects, and the chevrons come from
// hooks/use-codemirror-callout-fold.ts.

export interface DetailsFoldRange {
  /** `details:${openLine}`; the attribute edit shifts offsets but not lines. */
  blockId: string;
  /** Start of the header line (the chevron's anchor). */
  titleOffset: number;
  bodyFrom: number;
  bodyTo: number;
  /** No `open` attribute: the section starts folded. */
  initiallyCollapsed: boolean;
  /** Offset of the `<details` tag, for `setDetailsOpen`. */
  openFrom: number;
}

const blocksByDoc = new WeakMap<Text, DetailsBlock[]>();

/** Blocks for a doc, scanned once per `Text` however many extensions ask. */
export function detailsBlocksOf(doc: Text): DetailsBlock[] {
  let blocks = blocksByDoc.get(doc);
  if (!blocks) {
    blocks = findDetailsBlocks(doc.toString());
    blocksByDoc.set(doc, blocks);
  }
  return blocks;
}

/** Foldable sections: those whose closing line comes after the header line. */
export function detailsFoldRanges(doc: Text): DetailsFoldRange[] {
  return detailsBlocksOf(doc)
    .filter((b) => b.closeLine > b.headerLine)
    .map((b) => ({
      blockId: `details:${b.openLine}`,
      titleOffset: doc.line(b.headerLine + 1).from,
      bodyFrom: b.headerLineEnd,
      bodyTo: b.closeLineEnd,
      initiallyCollapsed: !b.open,
      openFrom: b.openFrom,
    }));
}

const REGEX_TAG = /^<details(?=[\s>])([^>]*)>/i;

/** Adds or removes the `open` attribute of the `<details>` tag at `openFrom`. False when already so or not a tag. */
export function setDetailsOpen(view: EditorView, openFrom: number, open: boolean): boolean {
  const { doc } = view.state;
  const line = doc.lineAt(openFrom);
  const tag = REGEX_TAG.exec(doc.sliceString(openFrom, line.to));
  if (!tag) return false;
  const attrs = tag[1];
  const hasOpen = REGEX_DETAILS_OPEN_ATTR.test(attrs);
  if (hasOpen === open) return false;
  if (open) {
    const at = openFrom + tag[0].length - 1 - (attrs.endsWith("/") ? 1 : 0);
    view.dispatch({ changes: { from: at, insert: " open" }, userEvent: "input.details.fold" });
  } else {
    const attrsFrom = openFrom + "<details".length;
    const changes = [...attrs.matchAll(new RegExp(REGEX_DETAILS_OPEN_ATTR.source, "gi"))].map((m) => ({
      from: attrsFrom + m.index,
      to: attrsFrom + m.index + m[0].length,
    }));
    view.dispatch({ changes, userEvent: "input.details.fold" });
  }
  return true;
}

const hidden = Decoration.replace({});
const bold = Decoration.mark({ class: "font-bold" });
const faded = Decoration.mark({ class: FADED });

/**
 * Bold summary text; the summary's tags (and an inline `<details>` tag) show
 * dimmed on the caret's lines and are hidden elsewhere; a `<details>` or
 * `</details>` tag on a line of its own always shows dimmed.
 */
export function buildDetailsMarkDecorations(
  state: EditorState,
  active: Set<number>,
  visibleRanges: readonly { from: number; to: number }[] = [{ from: 0, to: state.doc.length }],
): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  for (const b of detailsBlocksOf(state.doc)) {
    if (!visibleRanges.some((v) => b.openFrom <= v.to && b.closeTo >= v.from)) continue;
    const headerActive = active.has(b.headerLine + 1);
    const tag = (from: number, to: number) => {
      if (to > from) ranges.push((headerActive ? faded : hidden).range(from, to));
    };
    // Without a summary the tag is the whole line: hiding it would leave a blank row.
    if (b.summary && b.openLine === b.headerLine) tag(b.openFrom, b.openTagTo);
    else ranges.push(faded.range(b.openFrom, b.openTagTo));
    if (b.summary) {
      const { tagFrom, textFrom, textTo, tagTo } = b.summary;
      tag(tagFrom, textFrom);
      if (textTo > textFrom) ranges.push(bold.range(textFrom, textTo));
      tag(textTo, tagTo);
    }
    ranges.push(faded.range(b.closeFrom, b.closeTo));
  }
  return ranges.length ? Decoration.set(ranges, true) : Decoration.none;
}

export const detailsMarks = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDetailsMarkDecorations(view.state, activeLines(view.state, view.hasFocus), view.visibleRanges);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged || update.focusChanged) {
        this.decorations = buildDetailsMarkDecorations(
          update.state,
          activeLines(update.state, update.view.hasFocus),
          update.view.visibleRanges,
        );
      }
    }
  },
  { decorations: (value) => value.decorations },
);
