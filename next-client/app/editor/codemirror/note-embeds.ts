import { EditorState, Extension, Range, StateEffect, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import { noteToHtml } from "@/app/utils/print/note-html";
import { currentRenderTheme, renderBlock } from "../utils/rendered-block-cache";
import { embedKey, embedSection, findEmbeds, type EmbedRef } from "../utils/note-embeds";

// A line holding only `![[Note]]` (or `![[Note#Heading]]`), `/Note.md` or
// `/data.csv` shows that note's text, or the CSV as a table, under it,
// read-only. The line itself stays as typed; the embed is a
// block widget after it. Notes are read on the React side
// (hooks/use-note-embeds.ts) and pushed in with `setNoteEmbeds`; an embed
// whose note hasn't arrived yet shows "Loading…". Embeds inside an embed
// show as their names, so nothing can loop.

export type EmbedContent =
  | { kind: "note"; path: string; markdown: string }
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

const sameContent = (a: EmbedContent | undefined, b: EmbedContent | undefined) =>
  a === b || (!!a && !!b && a.kind === b.kind && (a.kind !== "note" || (b.kind === "note" && a.path === b.path && a.markdown === b.markdown)));

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

    // A note's title opens it; a CSV has nothing to open in the app.
    const title = document.createElement(ref.kind === "note" ? "button" : "div");
    title.className = "cm-note-embed-title";
    title.textContent = ref.heading ? `${ref.target} › ${ref.heading}` : ref.target;
    if (title instanceof HTMLButtonElement) {
      title.type = "button";
      title.title = "Open the note";
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
    else if (content.kind === "missing") frame.appendChild(message(ref.kind === "csv" ? "File not found" : "Note not found"));
    else if (content.kind === "self") frame.appendChild(message("A note can't embed itself"));
    else if (content.kind === "private") frame.appendChild(message("Private note: open it to read"));
    else {
      const section = embedSection(content.markdown, ref.heading);
      if (section === null) frame.appendChild(message(`No heading "${ref.heading}" in this note`));
      else if (!section) frame.appendChild(message(ref.kind === "csv" ? "Empty file" : "Empty note"));
      else {
        const body = document.createElement("div");
        body.className = "cm-note-embed-body";
        // noteToHtml escapes everything; the only markup is its own.
        const result = noteToHtml(section);
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

function buildDecorations(state: EditorState): DecorationSet {
  const text = state.doc.toString();
  if (!text.includes("![[") && !text.includes("/")) return Decoration.none;
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
    if (!transaction.docChanged && !transaction.effects.some((effect) => effect.is(setNoteEmbeds))) return value;
    return buildDecorations(transaction.state);
  },
  provide: (field) => EditorView.decorations.from(field),
});

export const noteEmbedsExtension: Extension = [noteEmbedsDataField, noteEmbedsField];
