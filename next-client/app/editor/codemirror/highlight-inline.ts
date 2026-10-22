import {
  REGEX_CODE_INLINE,
  REGEX_WIKILINK,
  REGEX_LINK,
  REGEX_BOLD,
  REGEX_ITALIC,
  REGEX_STRIKETHROUGH,
} from "../components/regex";

// The syntax highlighter's inline pass (highlight.ts), shared with the
// block styles it applies inside callouts too (highlight-blocks.ts).

export const FADED = "opacity-40 dark:opacity-50 transition-opacity duration-500 hover:opacity-100";
// Emphasis and inline-code marks, dimmed wherever they show, like other
// syntax, so the word they wrap stays what you read.
export const FADED_MARK = "opacity-40 dark:opacity-50";

export interface MarkRange {
  from: number;
  to: number;
  class: string;
}

export function mark(ranges: MarkRange[], from: number, to: number, className: string) {
  if (to > from) ranges.push({ from, to, class: className });
}

// Runs the inline regex passes (wikilinks, code, links, bold/italic,
// strikethrough; tags and dates are chips, tag-pills.ts and
// annotation-display.ts) over one line's label text, emitting
// absolute-position mark decorations. `base` is the doc offset of label[0].
export function processInline(ranges: MarkRange[], label: string, base: number) {
  const push = (from: number, to: number, cls: string) => mark(ranges, base + from, base + to, cls);

  if (label.includes("[[")) {
    for (const m of label.matchAll(REGEX_WIKILINK)) {
      if (/^\[\[\d{4}-\d{2}-\d{2}\]\]$/.test(m[0])) continue;
      push(m.index!, m.index! + 2, FADED);
      push(m.index! + 2, m.index! + m[0].length - 2, "!text-sage dark:!text-sage font-bold underline cursor-pointer");
      push(m.index! + m[0].length - 2, m.index! + m[0].length, FADED);
    }
  }

  if (label.includes("`")) {
    for (const m of label.matchAll(REGEX_CODE_INLINE)) {
      const [full, open, inner] = m;
      const i = m.index!;
      push(i, i + open.length, FADED_MARK);
      push(i + open.length, i + open.length + inner.length, "cm-inline-code");
      push(i + open.length + inner.length, i + full.length, FADED_MARK);
    }
  }

  if (label.includes("[")) {
    for (const m of label.matchAll(REGEX_LINK)) {
      const [, p1, p2, p3, p4, p5] = m;
      let i = m.index!;
      push(i, i + p1.length, FADED); i += p1.length;
      push(i, i + p2.length, "!text-sage dark:!text-sage underline"); i += p2.length;
      push(i, i + p3.length + p4.length + p5.length, FADED);
    }
  }

  if (label.includes("*") || label.includes("_")) {
    for (const m of label.matchAll(REGEX_BOLD)) {
      const [full, marker, inner] = m;
      const i = m.index!;
      push(i, i + marker.length, FADED_MARK);
      push(i + marker.length, i + marker.length + inner.length, "font-bold text-ink-light dark:text-ink-dark");
      push(i + marker.length + inner.length, i + full.length, FADED_MARK);
    }
    for (const m of label.matchAll(REGEX_ITALIC)) {
      const [full, marker, inner] = m;
      const i = m.index!;
      push(i, i + marker.length, FADED_MARK);
      push(i + marker.length, i + marker.length + inner.length, "italic text-ink-light dark:text-ink-dark");
      push(i + marker.length + inner.length, i + full.length, FADED_MARK);
    }
  }

  if (label.includes("~~")) {
    for (const m of label.matchAll(REGEX_STRIKETHROUGH)) {
      const [, p1, p2, p3] = m;
      let i = m.index!;
      push(i, i + p1.length, FADED_MARK); i += p1.length;
      push(i, i + p2.length, "line-through opacity-40"); i += p2.length;
      push(i, i + p3.length, FADED_MARK);
    }
  }
}
