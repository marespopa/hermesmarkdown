import { type EditorState, type Extension, RangeSet, StateField } from "@codemirror/state";
import { GutterMarker, gutterLineClass, lineNumbers } from "@codemirror/view";

// Line numbers that line up with their text. A gutter cell spans its whole
// line block but sets its number at the top; headings have a different line
// height, and fenced code padding above too (editor-typography.scss),
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

// Mirrors the line classes computeMarkdownDecorations (highlight.ts) gives
// headings and code blocks: frontmatter and fenced code are skipped as
// headings, and a heading on the first line has no room above it.
export function computeLineShapes(state: EditorState): RangeSet<GutterMarker> {
  const doc = state.doc;
  const ranges = [];
  let inFrontmatter = false;
  let inCode = false;
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
    if (REGEX_FENCE.test(text)) {
      ranges.push(shape(inCode ? "cm-gutter-codeblock" : "cm-gutter-codeblock-start").range(line.from));
      inCode = !inCode;
    } else if (inCode) {
      ranges.push(shape("cm-gutter-codeblock").range(line.from));
    } else {
      const heading = REGEX_HEADING.exec(text);
      if (heading) {
        const level = `cm-gutter-heading-${heading[1].length}`;
        ranges.push(shape(i === 1 ? `${level} cm-gutter-first` : level).range(line.from));
      }
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
