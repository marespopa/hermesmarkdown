import { EditorSelection, Range } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import {
  REGEX_DATE_DOTTED,
  REGEX_DATE_DUE,
  REGEX_DATE_ISO,
  REGEX_DATE_SLASHED,
  REGEX_DATE_WIKI,
} from "../components/regex";
import { REGEX_TASK_PRIORITY, type TaskPriority } from "@/app/utils/taskExtractor";
import { collectLinkDisplayMatches } from "./link-display";

type DateKind = "iso" | "slashed" | "dotted" | "wiki" | "due";

export interface AnnotationDisplayMatch {
  from: number;
  to: number;
  raw: string;
  label: string;
  type: "date" | "priority";
  kind: DateKind | TaskPriority;
}

function isValidDate(value: string, kind: DateKind): boolean {
  let year: number;
  let month: number;
  let day: number;

  if (kind === "slashed") {
    [month, day, year] = value.split("/").map(Number);
  } else if (kind === "dotted") {
    [day, month, year] = value.split(".").map(Number);
  } else {
    [year, month, day] = value.split("-").map(Number);
  }

  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year
    && parsed.getMonth() === month - 1
    && parsed.getDate() === day;
}

function overlaps(matches: AnnotationDisplayMatch[], from: number, to: number) {
  return matches.some((match) => from < match.to && to > match.from);
}

export function collectAnnotationDisplayMatches(doc: string): AnnotationDisplayMatch[] {
  const matches: AnnotationDisplayMatch[] = [];

  const addDate = (regex: RegExp, kind: DateKind, unwrap: (raw: string) => string = (raw) => raw) => {
    for (const match of doc.matchAll(regex)) {
      const from = match.index;
      const to = from + match[0].length;
      const value = unwrap(match[0]);
      if (overlaps(matches, from, to) || !isValidDate(value, kind)) continue;
      matches.push({
        from,
        to,
        raw: match[0],
        label: kind === "due" ? `Due ${value}` : value,
        type: "date",
        kind,
      });
    }
  };

  addDate(REGEX_DATE_DUE, "due", (raw) => raw.slice(5, -1));
  addDate(REGEX_DATE_WIKI, "wiki", (raw) => raw.slice(2, -2));
  addDate(REGEX_DATE_ISO, "iso");
  addDate(REGEX_DATE_SLASHED, "slashed");
  addDate(REGEX_DATE_DOTTED, "dotted");

  const priorityRegex = new RegExp(REGEX_TASK_PRIORITY.source, "gi");
  for (const match of doc.matchAll(priorityRegex)) {
    const from = match.index;
    const priority = match[1].toLowerCase() as TaskPriority;
    matches.push({
      from,
      to: from + match[0].length,
      raw: match[0],
      label: priority === "med" ? "Medium" : priority[0].toUpperCase() + priority.slice(1),
      type: "priority",
      kind: priority,
    });
  }

  const linkRanges = collectLinkDisplayMatches(doc);
  return matches
    .filter((match) => !linkRanges.some((link) => match.from < link.to && match.to > link.from))
    .sort((a, b) => a.from - b.from);
}

export function selectionTouchesAnnotation(selection: EditorSelection, from: number, to: number) {
  return selection.ranges.some((range) => range.to >= from && range.from <= to);
}

class AnnotationDisplayWidget extends WidgetType {
  constructor(private readonly match: AnnotationDisplayMatch) {
    super();
  }

  eq(other: AnnotationDisplayWidget) {
    return other.match.from === this.match.from
      && other.match.to === this.match.to
      && other.match.raw === this.match.raw
      && other.match.label === this.match.label;
  }

  toDOM() {
    const node = document.createElement("span");
    node.textContent = this.match.label;
    node.className = this.match.type === "date"
      ? `cm-annotation-display cm-date-display cm-date-display-${this.match.kind}`
      : `cm-annotation-display cm-priority-display cm-priority-display-${this.match.kind}`;
    node.setAttribute("aria-label", this.match.type === "date"
      ? `Date ${this.match.label}`
      : `Priority ${this.match.label}`);
    node.title = this.match.raw;
    return node;
  }

  ignoreEvent() {
    return false;
  }
}

export function buildAnnotationDisplayDecorations(view: EditorView): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const selection = view.state.selection;

  for (const match of collectAnnotationDisplayMatches(view.state.doc.toString())) {
    const visible = view.visibleRanges.some((range) => range.from <= match.from && match.to <= range.to);
    if (!visible || selectionTouchesAnnotation(selection, match.from, match.to)) continue;
    ranges.push(Decoration.replace({
      widget: new AnnotationDisplayWidget(match),
      side: 1,
    }).range(match.from, match.to));
  }

  return Decoration.set(ranges, true);
}

export const annotationDisplayPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildAnnotationDisplayDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildAnnotationDisplayDecorations(update.view);
      }
    }
  },
  { decorations: (value) => value.decorations },
);
