// Git Changes (Settings → Editor → View): thin gutter bars for the lines that
// differ from the file at HEAD. Added lines get a moss bar, changed lines a
// link-coloured bar, and a deletion a small danger-coloured wedge. The
// baseline (HEAD's text) arrives through `setGitBaseline` from
// use-git-baseline.ts; the diff is `Chunk.build` from @codemirror/merge, run
// 150 ms after the last edit, outside the typing transaction. Positions are
// mapped through edits in the meantime so bars stay on their lines.
import { Chunk } from "@codemirror/merge";
import { type Extension, RangeSet, StateEffect, StateField, Text } from "@codemirror/state";
import { EditorView, GutterMarker, ViewPlugin, type ViewUpdate, gutter } from "@codemirror/view";

/** Over this many lines the file shows no markers. */
export const MAX_GIT_LINES = 20000;
const DEBOUNCE_MS = 150;

/** HEAD's text, null for "no baseline" (every line added), or "off" (no markers, no gutter). */
export type GitBaseline = { text: string | null } | "off";

export const setGitBaseline = StateEffect.define<GitBaseline>();
const recompute = StateEffect.define<null>();

class ChangeMarker extends GutterMarker {
  constructor(private readonly className: string) {
    super();
  }
  toDOM() {
    const element = document.createElement("div");
    element.className = "cm-git-marker " + this.className;
    return element;
  }
}

class SpacerMarker extends GutterMarker {
  constructor(private readonly width: number) {
    super();
  }
  toDOM() {
    const element = document.createElement("div");
    element.style.width = this.width + "px";
    return element;
  }
}

const added = new ChangeMarker("cm-git-added");
const changed = new ChangeMarker("cm-git-changed");
const deleted = new ChangeMarker("cm-git-deleted");
const deletedEnd = new ChangeMarker("cm-git-deleted cm-git-deleted-end");
const barSpacer = new SpacerMarker(6);
const noSpacer = new SpacerMarker(0);

type Markers = RangeSet<GutterMarker>;

export function computeGitMarkers(base: Text | null, doc: Text): Markers {
  if (doc.lines > MAX_GIT_LINES) return RangeSet.empty;
  const ranges: { from: number; value: GutterMarker }[] = [];
  if (base === null) {
    for (let number = 1; number <= doc.lines; number++) {
      const line = doc.line(number);
      if (line.length > 0) ranges.push({ from: line.from, value: added });
    }
  } else {
    for (const chunk of Chunk.build(base, doc)) {
      if (chunk.fromB === chunk.toB) {
        const line = doc.lineAt(Math.min(chunk.fromB, doc.length));
        const atEnd = chunk.fromB > doc.length || (chunk.fromB === doc.length && line.from < chunk.fromB);
        ranges.push({ from: line.from, value: atEnd ? deletedEnd : deleted });
        continue;
      }
      const marker = chunk.fromA === chunk.toA ? added : changed;
      const first = doc.lineAt(chunk.fromB).number;
      const last = doc.lineAt(Math.min(chunk.endB, doc.length)).number;
      for (let number = first; number <= last; number++) ranges.push({ from: doc.line(number).from, value: marker });
    }
  }
  return RangeSet.of(
    ranges.map((range) => range.value.range(range.from)),
    true,
  );
}

interface GitChangesValue {
  base: Text | null | "off";
  markers: Markers;
}

export const gitChangesField = StateField.define<GitChangesValue>({
  create: () => ({ base: "off", markers: RangeSet.empty }),
  update(value, transaction) {
    let base = value.base;
    let refresh = false;
    for (const effect of transaction.effects) {
      if (effect.is(setGitBaseline)) {
        base = effect.value === "off" ? "off" : effect.value.text === null ? null : Text.of(effect.value.text.split(/\r?\n/));
        refresh = true;
      } else if (effect.is(recompute)) {
        refresh = true;
      }
    }
    if (refresh) return { base, markers: base === "off" ? RangeSet.empty : computeGitMarkers(base, transaction.state.doc) };
    if (transaction.docChanged) return { base, markers: value.markers.map(transaction.changes) };
    return value;
  },
});

// Recomputes the markers once typing pauses.
const debounceRecompute = ViewPlugin.fromClass(
  class {
    timer: ReturnType<typeof setTimeout> | undefined;
    constructor(private readonly view: EditorView) {}
    update(update: ViewUpdate) {
      if (!update.docChanged || this.view.state.field(gitChangesField).base === "off") return;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.view.dispatch({ effects: recompute.of(null) }), DEBOUNCE_MS);
    }
    destroy() {
      clearTimeout(this.timer);
    }
  },
);

const gitChangesTheme = EditorView.baseTheme({
  ".cm-gitChanges .cm-gutterElement": { padding: "0" },
  ".cm-git-marker": { position: "relative", width: "6px", height: "100%" },
  ".cm-git-added::before, .cm-git-changed::before": {
    content: '""',
    position: "absolute",
    left: "0",
    top: "0",
    width: "3px",
    height: "100%",
  },
  ".cm-git-added::before": { background: "var(--moss)" },
  ".cm-git-changed::before": { background: "var(--link)" },
  ".cm-git-deleted::before": {
    content: '""',
    position: "absolute",
    left: "0",
    top: "-3px",
    borderStyle: "solid",
    borderWidth: "3px 0 3px 5px",
    borderColor: "transparent transparent transparent var(--danger)",
  },
  ".cm-git-deleted-end::before": { top: "auto", bottom: "-3px" },
});

export function gitChanges(): Extension {
  return [
    gitChangesField,
    debounceRecompute,
    gutter({
      class: "cm-gitChanges",
      markers: (view) => view.state.field(gitChangesField).markers,
      // Reserve the bar's width only while a baseline is set, so files
      // without a usable repository take no space.
      initialSpacer: () => noSpacer,
      updateSpacer: (_spacer, update) => (update.state.field(gitChangesField).base === "off" ? noSpacer : barSpacer),
    }),
    gitChangesTheme,
  ];
}
