import { syntaxTree } from "@codemirror/language";
import { EditorState, Extension, Range, StateEffect, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import {
  currentRenderTheme,
  knownHeight,
  peekRendered,
  rememberHeight,
  renderBlock,
  renderKey,
  type RenderedBlockKind,
  type RenderedBlockTheme,
  type RenderResult,
} from "../utils/rendered-block-cache";
import { openRenderedBlockSource } from "../utils/open-helper-dialogs";
import { isPreviewMode } from "./preview-facet";

// Mermaid fences and display math (`$$ … $$`, ```math fences) are shown as
// their rendered output, like tables are shown as a grid. The source stays
// in the document; double-clicking a preview (or Ctrl/Cmd+Shift+Enter next
// to one) opens it in RenderedBlockSourceDialog, which writes the edited
// body back as one undoable change.

export interface RenderedBlockMatch {
  kind: RenderedBlockKind;
  // Whole lines, fences included — the replaced range.
  from: number;
  to: number;
  // The editable body between the fences / `$$` markers.
  bodyFrom: number;
  bodyTo: number;
  source: string;
}

const MERMAID_INFO = new Set(["mermaid"]);
const MATH_INFO = new Set(["math", "latex", "tex", "katex"]);
const CODE_NODES = new Set(["FencedCode", "CodeBlock", "HTMLBlock", "CommentBlock"]);
const CLOSING_FENCE = /^\s*(`{3,}|~{3,})\s*$/;

function collectFences(state: EditorState, found: RenderedBlockMatch[]) {
  const { doc } = state;
  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== "FencedCode") return;
      const info = node.node.getChild("CodeInfo");
      const lang = info ? doc.sliceString(info.from, info.to).trim().toLowerCase() : "";
      const kind: RenderedBlockKind | null = MERMAID_INFO.has(lang) ? "mermaid" : MATH_INFO.has(lang) ? "math" : null;
      if (!kind) return false;
      const first = doc.lineAt(node.from);
      const last = doc.lineAt(node.to);
      // Only top-level fences: inside a quote or list the body lines carry
      // prefixes that are not part of the diagram.
      if (first.from !== node.from && doc.sliceString(first.from, node.from).trim() !== "") return false;
      // Unterminated fences run to the end of the document while being typed.
      if (last.number === first.number || !CLOSING_FENCE.test(last.text)) return false;
      const bodyFrom = first.to + 1;
      const bodyTo = Math.max(bodyFrom, last.from - 1);
      found.push({ kind, from: first.from, to: last.to, bodyFrom, bodyTo, source: doc.sliceString(bodyFrom, bodyTo) });
      return false;
    },
  });
}

function insideCode(state: EditorState, pos: number): boolean {
  let node = syntaxTree(state).resolveInner(pos, 1);
  for (;;) {
    if (CODE_NODES.has(node.name)) return true;
    if (!node.parent) return false;
    node = node.parent;
  }
}

// `$$` on a line of its own opens and closes a block; `$$ x^2 $$` on one
// line is a single-line block.
function collectDollarBlocks(state: EditorState, found: RenderedBlockMatch[]) {
  const { doc } = state;
  if (!doc.toString().includes("$$")) return;
  for (let n = 1; n <= doc.lines; n++) {
    const line = doc.line(n);
    const text = line.text.trim();
    if (!text.startsWith("$$") || insideCode(state, line.from)) continue;
    if (text.length > 4 && text.endsWith("$$")) {
      const start = line.from + line.text.indexOf("$$") + 2;
      const end = line.from + line.text.lastIndexOf("$$");
      found.push({ kind: "math", from: line.from, to: line.to, bodyFrom: start, bodyTo: end, source: doc.sliceString(start, end).trim() });
      continue;
    }
    if (text !== "$$") continue;
    for (let m = n + 1; m <= doc.lines; m++) {
      const close = doc.line(m);
      if (close.text.trim() !== "$$") continue;
      const bodyFrom = line.to + 1;
      const bodyTo = Math.max(bodyFrom, close.from - 1);
      found.push({ kind: "math", from: line.from, to: close.to, bodyFrom, bodyTo, source: doc.sliceString(bodyFrom, bodyTo) });
      n = m;
      break;
    }
  }
}

export function collectRenderedBlocks(state: EditorState): RenderedBlockMatch[] {
  const found: RenderedBlockMatch[] = [];
  collectFences(state, found);
  collectDollarBlocks(state, found);
  return found.sort((a, b) => a.from - b.from).filter((match, i, all) => i === 0 || match.from > all[i - 1].to);
}

function fill(body: HTMLElement, kind: RenderedBlockKind, source: string, result: RenderResult) {
  body.replaceChildren();
  if (result.html !== undefined) {
    body.innerHTML = result.html;
    return;
  }
  const message = document.createElement("div");
  message.className = "cm-rendered-block-error";
  message.textContent = `${kind === "mermaid" ? "Diagram" : "Formula"} error: ${result.error}`;
  const code = document.createElement("pre");
  code.className = "cm-rendered-block-source";
  code.textContent = source || "(empty)";
  body.append(message, code);
}

class RenderedBlockWidget extends WidgetType {
  constructor(readonly match: RenderedBlockMatch, readonly theme: RenderedBlockTheme) {
    super();
  }

  get key() {
    return renderKey(this.match.kind, this.theme, this.match.source);
  }

  eq(other: RenderedBlockWidget) {
    return other.key === this.key;
  }

  get estimatedHeight() {
    return knownHeight(this.key) ?? (this.match.kind === "mermaid" ? 240 : 64);
  }

  toDOM(view: EditorView) {
    const { kind, source } = this.match;
    const key = this.key;
    const wrapper = document.createElement("div");
    wrapper.className = `cm-rendered-block cm-rendered-block-${kind}`;
    wrapper.setAttribute("contenteditable", "false");
    wrapper.title = "Double-click to edit the source";
    wrapper.setAttribute("aria-label", kind === "mermaid" ? "Mermaid diagram" : "Math formula");

    const body = document.createElement("div");
    body.className = "cm-rendered-block-body";
    wrapper.appendChild(body);

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "cm-rendered-block-edit";
    edit.textContent = "Edit";
    edit.setAttribute("aria-label", kind === "mermaid" ? "Edit Mermaid source" : "Edit LaTeX source");
    wrapper.appendChild(edit);

    const open = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      openBlockForDOM(view, wrapper);
    };
    wrapper.addEventListener("dblclick", open);
    edit.addEventListener("click", open);

    // Remember the drawn height for the next widget with this source; the
    // measure also lets the editor pick up the height change after rendering.
    const measure = () => view.requestMeasure({
      read: () => (wrapper.isConnected ? wrapper.getBoundingClientRect().height : 0),
      write: (height) => rememberHeight(key, height),
    });

    const cached = peekRendered(key);
    if (cached) {
      fill(body, kind, source, cached);
      measure();
    } else {
      body.textContent = kind === "mermaid" ? "Rendering diagram…" : "Rendering formula…";
      body.classList.add("cm-rendered-block-pending");
      void renderBlock(kind, this.theme, source).then((result) => {
        body.classList.remove("cm-rendered-block-pending");
        fill(body, kind, source, result);
        if (wrapper.isConnected) measure();
      });
    }
    return wrapper;
  }

  ignoreEvent() {
    return true;
  }
}

const setRenderTheme = StateEffect.define<RenderedBlockTheme>();

interface RenderedBlockState {
  theme: RenderedBlockTheme;
  matches: RenderedBlockMatch[];
  decorations: DecorationSet;
}

function buildState(state: EditorState, theme: RenderedBlockTheme): RenderedBlockState {
  const matches = collectRenderedBlocks(state);
  const ranges: Range<Decoration>[] = matches.map((match) =>
    Decoration.replace({ widget: new RenderedBlockWidget(match, theme), block: true, inclusive: true }).range(match.from, match.to),
  );
  return { theme, matches, decorations: Decoration.set(ranges, true) };
}

export const renderedBlockField = StateField.define<RenderedBlockState>({
  create: (state) => buildState(state, currentRenderTheme()),
  update(value, transaction) {
    const themeEffect = transaction.effects.find((effect) => effect.is(setRenderTheme));
    const theme = themeEffect ? themeEffect.value : value.theme;
    if (
      theme === value.theme
      && !transaction.docChanged
      && syntaxTree(transaction.startState) === syntaxTree(transaction.state)
    ) {
      return value;
    }
    return buildState(transaction.state, theme);
  },
  provide: (field) => [
    EditorView.decorations.from(field, (value) => value.decorations),
    EditorView.atomicRanges.of((view) => view.state.field(field).decorations),
  ],
});

// The block whose edge the caret sits on (atomic ranges keep it at an edge).
export function findRenderedBlockAt(state: EditorState, pos: number): RenderedBlockMatch | null {
  return state.field(renderedBlockField, false)?.matches.find((m) => pos >= m.from && pos <= m.to) ?? null;
}

// Preview is read-only, so neither route opens the source dialog there.
function openBlockForDOM(view: EditorView, dom: HTMLElement) {
  if (isPreviewMode(view.state)) return;
  const pos = view.posAtDOM(dom);
  const match = findRenderedBlockAt(view.state, pos);
  if (match) openRenderedBlockSource(view, match);
}

export function openRenderedBlockAtCaret(view: EditorView): boolean {
  const selection = view.state.selection.main;
  if (!selection.empty || isPreviewMode(view.state)) return false;
  const match = findRenderedBlockAt(view.state, selection.head);
  if (!match) return false;
  openRenderedBlockSource(view, match);
  return true;
}

// Writes `text` as the block's new body in one transaction (one undo step).
// The block is looked up again by its original position and source, since
// the document may have changed while the dialog was open.
export function applyRenderedBlockEdit(view: EditorView, original: RenderedBlockMatch, text: string): boolean {
  const matches = view.state.field(renderedBlockField, false)?.matches ?? [];
  const match = matches.find((m) => m.from === original.from && m.source === original.source)
    ?? matches.find((m) => m.kind === original.kind && m.source === original.source);
  if (!match) return false;
  if (text === match.source) return true;
  const { doc } = view.state;
  const firstLine = doc.lineAt(match.from).number;
  const lastLine = doc.lineAt(match.to).number;
  // Single-line `$$ … $$` keeps its spacing; fences with no line between
  // them need one added for the body.
  const insert = firstLine === lastLine
    ? ` ${text.trim()} `
    : lastLine === firstLine + 1 ? `${text}\n` : text;
  view.dispatch({ changes: { from: match.bodyFrom, to: match.bodyTo, insert }, userEvent: "input.rendered-block" });
  return true;
}

// Follows the app theme (the `dark` class on <html>) so diagrams re-render
// with matching colors.
const themeWatcher = ViewPlugin.fromClass(class {
  private observer: MutationObserver | null = null;

  constructor(private readonly view: EditorView) {
    if (typeof MutationObserver === "undefined") return;
    this.observer = new MutationObserver(() => {
      const theme = currentRenderTheme();
      if (theme !== this.view.state.field(renderedBlockField).theme) {
        this.view.dispatch({ effects: setRenderTheme.of(theme) });
      }
    });
    this.observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }

  destroy() {
    this.observer?.disconnect();
  }
});

// A template (the slash menu's Mermaid block) can leave the caret inside a
// freshly inserted, still empty block. It would be hidden by the preview, so
// open the source dialog for it instead.
const insertedBlockOpener = ViewPlugin.fromClass(class {
  update(update: ViewUpdate) {
    if (!update.docChanged) return;
    if (!update.transactions.some((tr) => tr.isUserEvent("input"))) return;
    const head = update.state.selection.main.head;
    const match = update.state.field(renderedBlockField).matches.find((m) => head > m.from && head < m.to);
    if (!match || match.source.trim() !== "") return;
    const view = update.view;
    queueMicrotask(() => {
      if (view.state.selection.main.head !== head) return;
      view.dispatch({ selection: { anchor: match.to } });
      openRenderedBlockSource(view, match);
    });
  }
});

export const renderedBlockExtension: Extension = [renderedBlockField, themeWatcher, insertedBlockOpener];
