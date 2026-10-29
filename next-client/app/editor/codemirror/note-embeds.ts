import { EditorState, Extension, Range, StateEffect, StateField, type Transaction } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import { noteToHtml } from "@/app/utils/print/note-html";
import { currentRenderTheme, renderBlock } from "../utils/rendered-block-cache";
import { highlightInto } from "../utils/highlight-code";
import { embedKey, embedSection, findEmbeds, type EmbedRef } from "../utils/note-embeds";

// A line holding only `![[Note]]` (or `![[Note#Heading]]`) or `/path.ext`
// shows that file under it, read-only: a note's text, a CSV as a table, an
// image, or a code file with syntax colours. The line itself stays as typed;
// the embed is a block widget after it. Files are read on the React side
// (hooks/use-note-embeds.ts) and pushed in with `setNoteEmbeds`; an embed
// whose file hasn't arrived yet shows "Loading…". Embeds inside an embedded
// note show as their names, so nothing can loop.

export type EmbedContent =
  /** A note's text, or a CSV already turned into a Markdown table. */
  | { kind: "note"; path: string; markdown: string }
  | { kind: "image"; path: string; url: string }
  /** `more`: lines left out past the shown limit. */
  | { kind: "code"; path: string; code: string; more: number }
  | { kind: "missing" }
  | { kind: "self" }
  | { kind: "private" };

export interface NoteEmbedsData {
  /** By `embedKey(ref)`. */
  contents: Map<string, EmbedContent>;
  /** Opens a note by name, like clicking its wikilink. */
  open: ((target: string) => void) | null;
}

export const setNoteEmbeds = StateEffect.define<NoteEmbedsData>();

export const noteEmbedsDataField = StateField.define<NoteEmbedsData>({
  create: () => ({ contents: new Map(), open: null }),
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setNoteEmbeds)) return effect.value;
    }
    return value;
  },
});

function sameContent(a: EmbedContent | undefined, b: EmbedContent | undefined): boolean {
  if (a === b) return true;
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === "note" && b.kind === "note") return a.path === b.path && a.markdown === b.markdown;
  if (a.kind === "image" && b.kind === "image") return a.url === b.url;
  if (a.kind === "code" && b.kind === "code") return a.path === b.path && a.code === b.code;
  return true;
}

const MISSING: Record<EmbedRef["kind"], string> = {
  note: "File not found",
  csv: "File not found",
  image: "Image not found",
  code: "File not found",
};

const heights = new Map<string, number>();

function message(text: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "cm-note-embed-message";
  el.textContent = text;
  return el;
}

// Mermaid and math in the embedded note come back from noteToHtml as
// placeholders; render them the way the editor's own blocks are.
function renderDeferred(body: HTMLElement, blocks: ReturnType<typeof noteToHtml>["blocks"], done: () => void) {
  const slots = Array.from(body.querySelectorAll<HTMLElement>("[data-render]"));
  if (!slots.length) return;
  const theme = currentRenderTheme();
  void Promise.all(slots.map(async (slot) => {
    const block = blocks[Number(slot.dataset.render)];
    if (!block) return;
    const result = await renderBlock(block.kind, theme, block.source);
    if (result.html !== undefined) slot.innerHTML = result.html;
    else slot.textContent = block.source;
  })).then(done);
}

class NoteEmbedWidget extends WidgetType {
  constructor(readonly ref: EmbedRef, readonly content: EmbedContent | undefined) {
    super();
  }

  eq(other: NoteEmbedWidget) {
    return embedKey(other.ref) === embedKey(this.ref) && sameContent(other.content, this.content);
  }

  get estimatedHeight() {
    return heights.get(embedKey(this.ref)) ?? 80;
  }

  toDOM(view: EditorView) {
    const { ref, content } = this;
    const key = embedKey(ref);
    const wrapper = document.createElement("div");
    wrapper.className = "cm-note-embed";
    wrapper.setAttribute("contenteditable", "false");

    const frame = document.createElement("div");
    frame.className = "cm-note-embed-frame";
    wrapper.appendChild(frame);

    // A note's title opens it; other files have nothing to open in the app.
    const title = document.createElement(ref.kind === "note" ? "button" : "div");
    title.className = "cm-note-embed-title";
    title.textContent = ref.heading ? `${ref.target} › ${ref.heading}` : ref.target;
    if (title instanceof HTMLButtonElement) {
      title.type = "button";
      title.title = "Open the file";
      title.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        view.state.field(noteEmbedsDataField, false)?.open?.(ref.target);
      });
    }
    frame.appendChild(title);

    const measure = () => view.requestMeasure({
      read: () => (wrapper.isConnected ? wrapper.getBoundingClientRect().height : 0),
      write: (height) => {
        if (height) heights.set(key, height);
      },
    });

    if (!content) frame.appendChild(message("Loading…"));
    else if (content.kind === "missing") frame.appendChild(message(MISSING[ref.kind]));
    else if (content.kind === "self") frame.appendChild(message("A file can't embed itself"));
    else if (content.kind === "private") frame.appendChild(message("Private note: open it to read"));
    else if (content.kind === "image") {
      const image = document.createElement("img");
      image.className = "cm-note-embed-image";
      image.src = content.url;
      image.alt = content.path.split("/").pop() ?? "";
      image.addEventListener("load", measure);
      frame.appendChild(image);
    } else if (content.kind === "code") {
      const pre = document.createElement("pre");
      pre.className = "cm-note-embed-code";
      const code = document.createElement("code");
      code.textContent = content.code;
      pre.appendChild(code);
      frame.appendChild(pre);
      if (content.more) frame.appendChild(message(`… ${content.more} more lines`));
      void highlightInto(code, content.code, content.path).then(measure);
    } else {
      const section = embedSection(content.markdown, ref.heading);
      if (section === null) frame.appendChild(message(`No heading "${ref.heading}" in this file`));
      else if (!section) frame.appendChild(message("Empty file"));
      else {
        const body = document.createElement("div");
        body.className = "cm-note-embed-body";
        // noteToHtml escapes everything; the only markup is its own.
        const result = noteToHtml(section, { openDetails: true });
        body.innerHTML = result.html;
        frame.appendChild(body);
        renderDeferred(body, result.blocks, measure);
      }
    }
    measure();
    return wrapper;
  }

  ignoreEvent() {
    return true;
  }
}

// Lines that can start or end an embed, or change which lines are code.
const EMBED_CANDIDATE = /^\s*(?:!\[\[|\/|`{3,}|~{3,})/;
const MAX_CHECKED_LINES = 500;

// Whether `transaction` touched a line that can matter to embeds, before or
// after the change. Typing in ordinary lines doesn't, so the widgets are only
// mapped to their new positions instead of rescanning the whole note.
export function touchesEmbedLines(transaction: Transaction): boolean {
  let touched = false;
  const check = (doc: EditorState["doc"], from: number, to: number) => {
    const first = doc.lineAt(from).number;
    const last = doc.lineAt(to).number;
    if (last - first > MAX_CHECKED_LINES) return true;
    for (let n = first; n <= last; n++) if (EMBED_CANDIDATE.test(doc.line(n).text)) return true;
    return false;
  };
  transaction.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
    if (!touched) touched = check(transaction.startState.doc, fromA, toA) || check(transaction.newDoc, fromB, toB);
  });
  return touched;
}

function findEmbedRefs(state: EditorState): readonly EmbedRef[] {
  const text = state.doc.toString();
  if (!text.includes("![[") && !/^\s*\//m.test(text)) return [];
  return findEmbeds(text).map(({ ref }) => ref);
}

// The React loader needs the same references as the widget extension. Keep
// them in editor state so ordinary edits do not make React rescan the note.
export const noteEmbedRefsField = StateField.define<readonly EmbedRef[]>({
  create: findEmbedRefs,
  update(value, transaction) {
    if (!transaction.docChanged || !touchesEmbedLines(transaction)) return value;
    return findEmbedRefs(transaction.state);
  },
});

function buildDecorations(state: EditorState): DecorationSet {
  const text = state.doc.toString();
  if (!text.includes("![[") && !/^\s*\//m.test(text)) return Decoration.none;
  const { contents } = state.field(noteEmbedsDataField);
  const ranges: Range<Decoration>[] = findEmbeds(text).map(({ line, ref }) =>
    Decoration.widget({ widget: new NoteEmbedWidget(ref, contents.get(embedKey(ref))), block: true, side: 1 })
      .range(state.doc.line(line).to),
  );
  return Decoration.set(ranges, true);
}

const noteEmbedsField = StateField.define<DecorationSet>({
  create: buildDecorations,
  update(value, transaction) {
    if (transaction.effects.some((effect) => effect.is(setNoteEmbeds))) return buildDecorations(transaction.state);
    if (!transaction.docChanged) return value;
    return touchesEmbedLines(transaction) ? buildDecorations(transaction.state) : value.map(transaction.changes);
  },
  provide: (field) => EditorView.decorations.from(field),
});

export const noteEmbedsExtension: Extension = [noteEmbedsDataField, noteEmbedRefsField, noteEmbedsField];
