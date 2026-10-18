import { ensureSyntaxTree } from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { history } from "@codemirror/commands";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterAll, test } from "vitest";
import { frontmatterCollapse } from "./frontmatter-fold";
import { computeMarkdownDecorations, markdownHighlightPlugin, type ScanCheckpoint } from "./highlight";
import { linkDisplayPlugin } from "./link-display";
import { buildLiveMarkerDecorations, liveMarkers } from "./live-markers";
import { activeLines, buildSyntaxRevealDecorations, syntaxReveal } from "./syntax-reveal";
import { collectTableDisplayMatches, tableDisplayExtension } from "./table-display";
import { tagPillPlugin } from "./tag-pills";

// How the editor's per-edit work grows with the note: `corepack yarn bench`
// (not part of `test` or CI; results print as a table per note size). Each size runs the same note shape: frontmatter,
// then sections of headings, paragraphs with marks, links and tags, lists and
// tasks, a table, a callout holding a list and a table, and a code block.
// The state-level benches decorate a 60-line window at the end of the note
// (the slowest place for highlight.ts without its saved checkpoints); the view benches
// type and move the caret in a real EditorView (jsdom, so no layout).

function section(n: number): string {
  return [
    `## Section ${n}`,
    "",
    `Some **bold** text, _emphasis_, ~~gone~~, \`code\`, a [link](https://example.com/${n}) and #release notes.`,
    "",
    "- [ ] Draft the changelog",
    "- [x] Review the build",
    "    - Nested step",
    "1. First",
    "2. Second",
    "",
    "| Item | Qty | Total |",
    "| --- | --- | --- |",
    `| Pen | ${n % 9} | =B2*2 |`,
    "| Pad | 3 | =B3*2 |",
    "",
    "> [!tip] Stock check",
    "> ### Inside the callout",
    "> - [ ] Count the shelf",
    "> | Item | Qty |",
    "> | --- | --- |",
    "> | Ink | 4 |",
    "",
    "```js",
    `const total = ${n};`,
    "```",
    "",
  ].join("\n");
}

function makeNote(lines: number): string {
  const head = "---\ntitle: Benchmark note\nstatus: draft\ntags: work, ideas\n---\n\n";
  const parts: string[] = [];
  let count = 0;
  for (let n = 1; count < lines; n++) {
    const part = section(n);
    parts.push(part);
    count += part.split("\n").length;
  }
  return head + parts.join("\n");
}

const extensions = [
  history(),
  markdown({ base: markdownLanguage }),
  frontmatterCollapse,
  markdownHighlightPlugin,
  tagPillPlugin,
  linkDisplayPlugin,
  liveMarkers,
  syntaxReveal,
  tableDisplayExtension,
];

const views: EditorView[] = [];
afterAll(() => {
  for (const view of views.splice(0)) view.destroy();
});

// The whole note parsed. ensureSyntaxTree parses into the state's parse
// context; the tree reaches syntaxTree(state) with the next transaction.
function parsedState(doc: string): EditorState {
  const state = EditorState.create({ doc, extensions: [markdown({ base: markdownLanguage })] });
  ensureSyntaxTree(state, state.doc.length, 60_000);
  return state.update({}).state;
}

function openView(doc: string): EditorView {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const view = new EditorView({
    parent,
    state: EditorState.create({ doc, selection: EditorSelection.cursor(doc.length), extensions }),
  });
  ensureSyntaxTree(view.state, view.state.doc.length, 60_000);
  view.dispatch({});
  views.push(view);
  return view;
}

for (const lines of [2_000, 20_000]) {
  test(`${lines.toLocaleString("en-US")}-line note`, async ({ bench }) => {
    const doc = makeNote(lines);
    const state = parsedState(doc);
    const lastLine = state.doc.line(state.doc.lines);
    const lastScreen = [{ from: state.doc.line(Math.max(1, state.doc.lines - 60)).from, to: lastLine.to }];
    const active = activeLines(state, true);
    // As the editor keeps them: filled by an earlier read of the note.
    const checkpoints: ScanCheckpoint[] = [];
    computeMarkdownDecorations(state, lastScreen[0], checkpoints);
    // One view per size: every iteration types into the same note, as you would.
    const view = openView(doc);

    await bench.compare(
      bench("open: parse the whole note", () => {
        parsedState(doc);
      }),
      bench("highlight: decorate the last screen (reads from the top)", () => {
        computeMarkdownDecorations(state, lastScreen[0]);
      }),
      bench("highlight: decorate the last screen (from saved checkpoints)", () => {
        computeMarkdownDecorations(state, lastScreen[0], checkpoints);
      }),
      bench("tables: find and parse every table", () => {
        collectTableDisplayMatches(state);
      }),
      bench("live markers: decorate one screen", () => {
        buildLiveMarkerDecorations(state, lastScreen);
      }),
      bench("syntax reveal: decorate one screen", () => {
        buildSyntaxRevealDecorations(state, lastScreen, active);
      }),
      bench("view: type one character at the end", () => {
        const end = view.state.doc.length;
        view.dispatch({ changes: { from: end, insert: "a" }, selection: EditorSelection.cursor(end + 1), userEvent: "input.type" });
      }),
      bench("view: move the caret one line up and back", () => {
        const head = view.state.selection.main.head;
        const up = view.state.doc.line(Math.max(1, view.state.doc.lineAt(head).number - 1)).from;
        view.dispatch({ selection: EditorSelection.cursor(up), userEvent: "select" });
        view.dispatch({ selection: EditorSelection.cursor(head), userEvent: "select" });
      }),
    );
  }, 600_000);
}
