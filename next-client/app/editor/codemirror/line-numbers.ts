import { type EditorState, type Extension, RangeSet, StateField } from "@codemirror/state";
import { GutterMarker, gutterLineClass, lineNumbers } from "@codemirror/view";
import { calloutBodyPrefixLength } from "./highlight-blocks";

// Line numbers that line up with their text. A gutter cell spans its whole
// line block but sets its number at the top; headings have a different line
// height, and fenced code padding above too (editor-typography.scss), and
// so do a callout's first line, headings and code (live-markers-theme.ts),
// so their numbers floated above the text. Each such cell gets a class naming
// the line's shape, and the stylesheet gives it the same padding and line
// height, which centres the number on the line's first row of text.

class LineShape extends GutterMarker {
  constructor(readonly elementClass: string) {
    super();
  }
}

const shapes = new Map<string, LineShape>();
const shape = (name: string) => {
  let marker = shapes.get(name);
  if (!marker) shapes.set(name, (marker = new LineShape(name)));
  return marker;
};

const REGEX_HEADING = /^(#{1,6})\s/;
const REGEX_FENCE = /^(```|~~~)/;
const REGEX_FRONTMATTER_FENCE = /^---\s*$/;
const REGEX_CALLOUT_START = /^(>\s*)+\[!\w+\]/;
const REGEX_QUOTE_DEPTH = /^(>\s*)+/;
// A callout body's fence (highlight-blocks.ts) and a quote inside it.
const REGEX_BODY_FENCE = /^\s*(```|~~~)/;
const REGEX_BODY_QUOTE = /^(?:>[ \t]*)+/;

const quoteDepth = (text: string) => (REGEX_QUOTE_DEPTH.exec(text)?.[0].match(/>/g) ?? []).length;
const headingShape = (text: string, first: boolean) => {
  const heading = REGEX_HEADING.exec(text);
  if (!heading) return null;
  const level = `cm-gutter-heading-${heading[1].length}`;
  return shape(first ? `${level} cm-gutter-first` : level);
};

// Mirrors the line classes computeMarkdownDecorations (highlight.ts) gives
// headings, code blocks and callouts: frontmatter and fenced code are skipped
// as headings, and a heading on the first line has no room above it. A
// callout's body (after its own `>`s) has headings, a quote's heading and
// code blocks shaped as at the top level.
export function computeLineShapes(state: EditorState): RangeSet<GutterMarker> {
  const doc = state.doc;
  const ranges = [];
  let inFrontmatter = false;
  let inCode = false;
  // The open callout's depth (0 = none) and whether its body is in a fence.
  let calloutDepth = 0;
  let calloutCode = false;
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const text = line.text;
    if (i === 1 && REGEX_FRONTMATTER_FENCE.test(text)) {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (REGEX_FRONTMATTER_FENCE.test(text)) inFrontmatter = false;
      continue;
    }
    if (calloutDepth && quoteDepth(text) >= calloutDepth) {
      const body = text.slice(calloutBodyPrefixLength(text, calloutDepth));
      if (REGEX_BODY_FENCE.test(body)) {
        ranges.push(shape(calloutCode ? "cm-gutter-codeblock" : "cm-gutter-codeblock-start").range(line.from));
        calloutCode = !calloutCode;
      } else if (calloutCode) {
        ranges.push(shape("cm-gutter-codeblock").range(line.from));
      } else {
        const heading = headingShape(body.replace(REGEX_BODY_QUOTE, ""), false);
        if (heading) ranges.push(heading.range(line.from));
      }
      continue;
    }
    calloutDepth = 0;
    calloutCode = false;
    if (!inCode && REGEX_CALLOUT_START.test(text)) {
      calloutDepth = quoteDepth(text);
      ranges.push(shape("cm-gutter-callout-start").range(line.from));
    } else if (REGEX_FENCE.test(text)) {
      ranges.push(shape(inCode ? "cm-gutter-codeblock" : "cm-gutter-codeblock-start").range(line.from));
      inCode = !inCode;
    } else if (inCode) {
      ranges.push(shape("cm-gutter-codeblock").range(line.from));
    } else {
      const heading = headingShape(text, i === 1);
      if (heading) ranges.push(heading.range(line.from));
    }
  }
  return RangeSet.of(ranges);
}

const lineShapes = StateField.define<RangeSet<GutterMarker>>({
  create: computeLineShapes,
  update: (value, transaction) => (transaction.docChanged ? computeLineShapes(transaction.state) : value),
  provide: (field) => gutterLineClass.from(field),
});

export function editorLineNumbers(): Extension {
  return [lineNumbers(), lineShapes];
}
