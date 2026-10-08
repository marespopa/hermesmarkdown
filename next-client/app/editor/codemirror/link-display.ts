import { EditorSelection, Range } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";

export interface LinkDisplayMatch {
  from: number;
  to: number;
  label: string;
  target: string;
  type: "url" | "wiki";
}

const MARKDOWN_LINK = /(?<!!)\[([^\]\n]+)\]\(([^)\n]+)\)/g;
const WIKILINK = /\[\[([^\]\n]+)\]\]/g;
const DATE_WIKILINK = /^\d{4}-\d{2}-\d{2}$/;

export function collectLinkDisplayMatches(doc: string): LinkDisplayMatch[] {
  const matches: LinkDisplayMatch[] = [];

  for (const match of doc.matchAll(MARKDOWN_LINK)) {
    const from = match.index;
    matches.push({
      from,
      to: from + match[0].length,
      label: match[1],
      target: match[2],
      type: "url",
    });
  }

  for (const match of doc.matchAll(WIKILINK)) {
    const target = match[1];
    if (DATE_WIKILINK.test(target)) continue;
    const [name, ...aliasParts] = target.split("|");
    const from = match.index;
    matches.push({
      from,
      to: from + match[0].length,
      label: aliasParts.join("|").trim() || name.trim(),
      target: target.trim(),
      type: "wiki",
    });
  }

  return matches.sort((a, b) => a.from - b.from);
}

export function selectionTouchesLink(selection: EditorSelection, from: number, to: number) {
  return selection.ranges.some((range) => range.to >= from && range.from <= to);
}

class LinkDisplayWidget extends WidgetType {
  constructor(private readonly match: LinkDisplayMatch) {
    super();
  }

  eq(other: LinkDisplayWidget) {
    return other.match.from === this.match.from
      && other.match.to === this.match.to
      && other.match.label === this.match.label
      && other.match.target === this.match.target
      && other.match.type === this.match.type;
  }

  toDOM() {
    const node = document.createElement("span");
    node.textContent = this.match.label;
    node.className = `cm-link-display cm-link-display-${this.match.type}`;
    node.setAttribute("aria-label", `${this.match.type === "wiki" ? "WikiLink" : "Link"} ${this.match.label}`);
    node.dataset.linkTarget = this.match.target;
    node.title = this.match.type === "wiki" || /^https?:\/\//i.test(this.match.target)
      ? `${this.match.target} - Ctrl/Cmd+click to open`
      : this.match.target;

    return node;
  }

  ignoreEvent() {
    return false;
  }
}

// While a link's label is being edited, its `(url)` folds into a small ↗,
// so the paragraph doesn't reflow around a long URL. Clicking the ↗ puts the
// caret in the URL, which unfolds it.
class LinkUrlChipWidget extends WidgetType {
  constructor(private readonly target: string, private readonly urlFrom: number) {
    super();
  }

  eq(other: LinkUrlChipWidget) {
    return other.target === this.target && other.urlFrom === this.urlFrom;
  }

  toDOM(view: EditorView) {
    const node = document.createElement("span");
    node.className = "cm-link-url-chip";
    node.textContent = "↗";
    node.title = `${this.target} - click to edit`;
    node.addEventListener("mousedown", (event) => {
      event.preventDefault();
      view.dispatch({ selection: { anchor: this.urlFrom + 1 }, userEvent: "select.link-url" });
      view.focus();
    });
    return node;
  }

  ignoreEvent() {
    return true;
  }
}

// Where a Markdown link's `(url)` starts: after "[", the label and "]".
export function linkUrlFrom(match: LinkDisplayMatch): number {
  return match.from + match.label.length + 2;
}

export function buildLinkDisplayDecorations(view: EditorView): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const selection = view.state.selection;

  for (const match of collectLinkDisplayMatches(view.state.doc.toString())) {
    const visible = view.visibleRanges.some((range) => range.from <= match.from && match.to <= range.to);
    if (!visible) continue;
    if (!selectionTouchesLink(selection, match.from, match.to)) {
      ranges.push(Decoration.replace({ widget: new LinkDisplayWidget(match), side: 1 }).range(match.from, match.to));
      continue;
    }
    if (match.type !== "url") continue;
    // The URL unfolds once the selection reaches inside its parentheses.
    const urlFrom = linkUrlFrom(match);
    if (selection.ranges.some((range) => range.to > urlFrom && range.from < match.to)) continue;
    const widget = new LinkUrlChipWidget(match.target, urlFrom);
    ranges.push(Decoration.replace({ widget }).range(urlFrom, match.to));
  }

  return Decoration.set(ranges, true);
}

export const linkDisplayPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildLinkDisplayDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildLinkDisplayDecorations(update.view);
      }
    }
  },
  { decorations: (value) => value.decorations },
);
