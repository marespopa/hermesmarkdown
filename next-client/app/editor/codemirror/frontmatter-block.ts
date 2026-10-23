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

const SUMMARY_TAG_LIMIT = 3;
const unquote = (value: string) => value.trim().replace(/^['"]|['"]$/g, "").trim();

// What folded frontmatter shows after its name (heading-fold.ts): the
// `title`'s value, then the first few tags ("#work #ideas +1"); either is
// left out when empty.
export function frontmatterSummary(state: EditorState): string[] {
  const range = frontmatterRangeOf(state.doc);
  if (!range) return [];
  const fields = parseFmFields(state.doc.sliceString(0, range.closeTo));
  const title = unquote(fields.title ?? "");
  const tags = (fields.tags ?? "").split(",").map((tag) => unquote(tag).replace(/^#/, "")).filter(Boolean);
  const shown = tags.slice(0, SUMMARY_TAG_LIMIT).map((tag) => `#${tag}`);
  if (tags.length > SUMMARY_TAG_LIMIT) shown.push(`+${tags.length - SUMMARY_TAG_LIMIT}`);
  return [title, shown.join(" ")].filter(Boolean);
}

// Room between the frontmatter and text that follows its closing `---`
// directly (see `.cm-frontmatter-spacer` in theme.ts).
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
    return 24;
  }
}

const spacer = Decoration.widget({ block: true, side: 1, widget: new FrontmatterSpacerWidget() });

// Rebuilt on every edit, so it reads only the block itself, never the whole note.
function spacerDecorations(state: EditorState): DecorationSet {
  const range = frontmatterRangeOf(state.doc);
  if (!range) return Decoration.none;
  const next = state.doc.lineAt(range.closeTo).number + 1;
  if (next > state.doc.lines || state.doc.line(next).text.trim() === "") return Decoration.none;
  return Decoration.set([spacer.range(range.closeTo)]);
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
