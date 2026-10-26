import { EditorState, StateField, Text } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import { parseFmFields } from "@/app/utils/frontmatter-utils";

// The frontmatter is shown as typed: its YAML lines on a tinted panel
// (`.cm-frontmatter-line`, highlight.ts / theme.ts). It folds like a heading
// section, from a chevron by its opening `---` (heading-fold.ts).

export interface FrontmatterRange {
  // End of the closing `---` delimiter.
  closeTo: number;
}

// The block at the top of the editor's document, without turning the whole
// note into a string: it reads lines from the top only as far as the block
// goes (a note without frontmatter costs one line), and each document is
// read once however many extensions ask during one update.
const rangeByDoc = new WeakMap<Text, FrontmatterRange | null>();
const FENCE = /^---\s*$/;

export function frontmatterRangeOf(doc: Text): FrontmatterRange | null {
  const cached = rangeByDoc.get(doc);
  if (cached !== undefined) return cached;
  let range: FrontmatterRange | null = null;
  if (doc.lines >= 3 && FENCE.test(doc.line(1).text)) {
    for (let n = 2; n <= doc.lines; n++) {
      if (FENCE.test(doc.line(n).text)) {
        range = { closeTo: doc.line(n).to };
        break;
      }
    }
  }
  rangeByDoc.set(doc, range);
  return range;
}

const unquote = (value: string) => value.trim().replace(/^['"]|['"]$/g, "").trim();

export interface FrontmatterSummary {
  title: string;
  tags: string[];
}

// What folded frontmatter shows (heading-fold.ts): the `title`'s value (the
// `name`'s when there's no title) and every tag, without its `#`; either is
// empty when the block has none.
export function frontmatterSummary(state: EditorState): FrontmatterSummary {
  const range = frontmatterRangeOf(state.doc);
  if (!range) return { title: "", tags: [] };
  const fields = parseFmFields(state.doc.sliceString(0, range.closeTo));
  const title = unquote(fields.title ?? "") || unquote(fields.name ?? "");
  const tags = (fields.tags ?? "").split(",").map((tag) => unquote(tag).replace(/^#/, "")).filter(Boolean);
  return { title, tags };
}

// Room between the frontmatter and the text under it, the same either way
// (`--frontmatter-gap`, theme.ts): text right after the closing `---` gets
// a spacer block, and the one blank line most notes have there is drawn at
// that height (`.cm-frontmatter-gap`) instead of a full line. Only a single
// blank line: two or more add room as anywhere else, and a blank last line
// keeps its full height to type on.
class FrontmatterSpacerWidget extends WidgetType {
  eq() {
    return true;
  }

  toDOM() {
    const element = document.createElement("div");
    element.className = "cm-frontmatter-spacer";
    element.setAttribute("aria-hidden", "true");
    return element;
  }

  get estimatedHeight() {
    return 16;
  }
}

const spacer = Decoration.widget({ block: true, side: 1, widget: new FrontmatterSpacerWidget() });
const gapLine = Decoration.line({ class: "cm-frontmatter-gap" });

// Rebuilt on every edit, so it reads only the block itself, never the whole note.
function spacerDecorations(state: EditorState): DecorationSet {
  const range = frontmatterRangeOf(state.doc);
  if (!range) return Decoration.none;
  const next = state.doc.lineAt(range.closeTo).number + 1;
  if (next > state.doc.lines) return Decoration.none;
  const nextLine = state.doc.line(next);
  if (nextLine.text.trim() !== "") return Decoration.set([spacer.range(range.closeTo)]);
  if (next + 1 > state.doc.lines || state.doc.line(next + 1).text.trim() === "") return Decoration.none;
  return Decoration.set([gapLine.range(nextLine.from)]);
}

export const frontmatterSpacer = StateField.define<DecorationSet>({
  create: spacerDecorations,
  update: (value, tr) => (tr.docChanged ? spacerDecorations(tr.state) : value),
  provide: (field) => EditorView.decorations.from(field),
});

// The "Frontmatter" slash/palette command: jumps to the title line of an
// existing frontmatter block, or inserts a starter `title` / `tags` block at
// the top with the cursor on the title.
export function insertOrRevealFrontmatter(view: EditorView) {
  if (frontmatterRangeOf(view.state.doc)) {
    const titleLineEnd = view.state.doc.line(2).to;
    view.dispatch({
      selection: { anchor: titleLineEnd },
      effects: EditorView.scrollIntoView(titleLineEnd, { y: "center" }),
    });
    view.focus();
    return;
  }

  const frontmatter = "---\ntitle: \ntags: []\n---\n\n";
  const titleLineEnd = frontmatter.indexOf("title: ") + "title: ".length;
  view.dispatch({
    changes: { from: 0, insert: frontmatter },
    selection: { anchor: titleLineEnd },
    userEvent: "input.replace.template",
  });
  view.focus();
}
