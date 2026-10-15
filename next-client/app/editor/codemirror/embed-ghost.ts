import { EditorSelection, Prec, type EditorState, type Extension } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, keymap, ViewPlugin, type ViewUpdate, WidgetType } from "@codemirror/view";

// Inline completion for embed lines: while a line holds only `/` and the
// start of a note's name (or path), the rest of the best match shows as faded
// text after the caret. Tab, or → at the end of the line, accepts it and
// writes the note's full path (`/specs/Road trip.md`), which embeds it
// (utils/note-embeds.ts). Typing anything else just updates or drops it.

export interface EmbedGhost {
  /** The whole line, replaced on accept. */
  from: number;
  to: number;
  /** The line after accepting. */
  insert: string;
  /** The faded text shown after the caret. */
  suffix: string;
}

const GHOST_LINE = /^\/([^\s/][^\n]*)$/;

// The best note for `query`: a path starting with it, else a name starting
// with it (shortest path first). Null when nothing completes it.
export function bestEmbedCompletion(paths: string[], query: string): { path: string; suffix: string } | null {
  const q = query.toLowerCase();
  let best: { path: string; suffix: string } | null = null;
  for (const path of paths) {
    const lower = path.toLowerCase();
    const name = path.split("/").pop()!;
    let suffix: string | null = null;
    if (lower.startsWith(q)) suffix = path.slice(q.length);
    else if (name.toLowerCase().startsWith(q)) suffix = name.slice(q.length);
    if (!suffix) continue;
    if (!best || path.length < best.path.length || (path.length === best.path.length && path < best.path)) best = { path, suffix };
  }
  return best;
}

export function findEmbedGhost(state: EditorState, paths: () => string[]): EmbedGhost | null {
  const selection = state.selection.main;
  if (!selection.empty) return null;
  const line = state.doc.lineAt(selection.head);
  if (selection.head !== line.to) return null;
  const match = GHOST_LINE.exec(line.text);
  if (!match) return null;
  const best = bestEmbedCompletion(paths(), match[1]);
  if (!best) return null;
  return { from: line.from, to: line.to, insert: `/${best.path}`, suffix: best.suffix };
}

class GhostWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  eq(other: GhostWidget) {
    return other.text === this.text;
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-embed-ghost";
    span.textContent = this.text;
    span.setAttribute("aria-hidden", "true");
    return span;
  }

  ignoreEvent() {
    return false;
  }
}

export function embedGhost(paths: () => string[]): Extension {
  const plugin = ViewPlugin.fromClass(
    class {
      ghost: EmbedGhost | null;
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.ghost = findEmbedGhost(view.state, paths);
        this.decorations = this.build();
      }
      update(update: ViewUpdate) {
        if (!update.docChanged && !update.selectionSet) return;
        this.ghost = findEmbedGhost(update.state, paths);
        this.decorations = this.build();
      }
      build(): DecorationSet {
        if (!this.ghost) return Decoration.none;
        return Decoration.set([Decoration.widget({ widget: new GhostWidget(this.ghost.suffix), side: 1 }).range(this.ghost.to)]);
      }
    },
    { decorations: (value) => value.decorations },
  );

  const accept = (view: EditorView) => {
    const ghost = view.plugin(plugin)?.ghost;
    if (!ghost) return false;
    view.dispatch({
      changes: { from: ghost.from, to: ghost.to, insert: ghost.insert },
      selection: EditorSelection.cursor(ghost.from + ghost.insert.length),
      userEvent: "input.complete",
    });
    return true;
  };

  return [
    plugin,
    // Ahead of list indenting (Tab) and the completion popup.
    Prec.highest(keymap.of([
      { key: "Tab", run: accept },
      { key: "ArrowRight", run: accept },
    ])),
    EditorView.theme({
      ".cm-embed-ghost": { color: "var(--fg-faint)", pointerEvents: "none" },
    }),
  ];
}
