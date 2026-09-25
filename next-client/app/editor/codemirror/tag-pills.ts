import { EditorSelection, Range } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { WORKFLOW_TAGS, TODO_TAGS } from "../components/constants";
import { REGEX_HASHTAG } from "../components/regex";

export interface TagMatch {
  from: number;
  to: number;
  text: string;
  tagName: string;
  kind: "workflow" | "todo" | "custom";
}

export interface FrontmatterTagList {
  from: number;
  to: number;
  tags: TagMatch[];
}

function parseTagName(value: string): string | null {
  const cleaned = value.trim().replace(/^['"]|['"]$/g, "").replace(/^#/, "");
  if (!cleaned || !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(cleaned)) return null;
  return cleaned.toLowerCase();
}

function buildTagMatch(rawText: string, from: number, to: number): TagMatch | null {
  const tagName = parseTagName(rawText);
  if (!tagName) return null;
  const kind: TagMatch["kind"] = WORKFLOW_TAGS.includes(tagName) || TODO_TAGS.includes(tagName)
    ? (WORKFLOW_TAGS.includes(tagName) ? "workflow" : "todo")
    : "custom";

  return {
    from,
    to,
    text: `#${tagName}`,
    tagName,
    kind,
  };
}

function collectFrontmatterTagMatchesForLine(line: string, lineStart: number): TagMatch[] {
  const matches: TagMatch[] = [];
  const tagsLine = line.match(/^\s*tags\s*:\s*(.*)$/);
  if (!tagsLine) return matches;

  const value = tagsLine[1];
  const valueStart = lineStart + tagsLine[0].indexOf(value);
  const listText = value.trim();
  if (!listText) return matches;

  const tokenPattern = /(?:^|[[,\s])(?:['"])?([A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*)(?:['"])?(?=$|[\],\s])/g;
  let tokenMatch: RegExpExecArray | null;
  while ((tokenMatch = tokenPattern.exec(value)) !== null) {
    const token = tokenMatch[1];
    if (!token) continue;
    const start = valueStart + tokenMatch.index + tokenMatch[0].indexOf(token);
    const end = start + token.length;
    const built = buildTagMatch(token, start, end);
    if (built) matches.push(built);
  }

  return matches;
}

function frontmatterTagListForLine(line: string, lineStart: number): FrontmatterTagList | null {
  const tagsLine = line.match(/^\s*tags\s*:\s*(.*)$/);
  if (!tagsLine) return null;

  const value = tagsLine[1];
  const valueStart = lineStart + tagsLine[0].indexOf(value);
  const listText = value.trim();
  if (!listText) return null;
  const tags = collectFrontmatterTagMatchesForLine(line, lineStart);
  if (listText !== "[]" && !tags.length) return null;

  const from = valueStart + value.indexOf(listText);
  return {
    from,
    to: from + listText.length,
    tags,
  };
}

export function collectFrontmatterTagLists(doc: string): FrontmatterTagList[] {
  const lists: FrontmatterTagList[] = [];
  const lines = doc.split("\n");
  let lineStart = 0;
  let inFrontmatter = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (i === 0 && /^---\s*$/.test(line)) {
      inFrontmatter = true;
    } else if (inFrontmatter && /^---\s*$/.test(line)) {
      inFrontmatter = false;
    } else if (inFrontmatter) {
      const list = frontmatterTagListForLine(line, lineStart);
      if (list) lists.push(list);
    }
    lineStart += line.length + 1;
  }

  return lists;
}

export function collectTagMatches(doc: string): TagMatch[] {
  const matches: TagMatch[] = [];
  const lines = doc.split("\n");
  let inFrontmatter = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineStart = i === 0 ? 0 : lines.slice(0, i).reduce((len, part) => len + part.length + 1, 0);

    if (i === 0 && /^---\s*$/.test(line)) {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter && /^---\s*$/.test(line)) {
      inFrontmatter = false;
      continue;
    }

    if (inFrontmatter) {
      matches.push(...collectFrontmatterTagMatchesForLine(line, lineStart));
    }

    for (const match of line.matchAll(REGEX_HASHTAG)) {
      const whitespace = match[1] ?? "";
      const fullTag = match[2];
      const tagStart = lineStart + match.index! + whitespace.length;
      const tagEnd = tagStart + fullTag.length;
      const tagName = fullTag.slice(1).toLowerCase();
      matches.push({
        from: tagStart,
        to: tagEnd,
        text: fullTag,
        tagName,
        kind: WORKFLOW_TAGS.includes(tagName) || TODO_TAGS.includes(tagName)
          ? (WORKFLOW_TAGS.includes(tagName) ? "workflow" : "todo")
          : "custom",
      });
    }
  }

  return matches;
}

export function selectionTouchesTag(selection: EditorSelection, from: number, to: number) {
  return selection.ranges.some((range) => range.to >= from && range.from <= to);
}

class TagPillWidget extends WidgetType {
  constructor(private readonly match: TagMatch) {
    super();
  }

  eq(other: TagPillWidget) {
    return other.match.from === this.match.from && other.match.to === this.match.to && other.match.text === this.match.text;
  }

  toDOM(view: EditorView) {
    const node = document.createElement("span");
    node.textContent = this.match.text;
    node.className = "cm-tag-pill" + (this.match.kind === "workflow"
      ? " cm-tag-pill-workflow"
      : this.match.kind === "todo"
        ? " cm-tag-pill-todo"
        : " cm-tag-pill-custom");
    node.setAttribute("aria-label", `Tag ${this.match.text}`);
    node.title = this.match.text;

    node.addEventListener("mousedown", (event) => {
      event.preventDefault();
      view.dispatch({
        selection: { anchor: this.match.from, head: this.match.from },
        userEvent: "select.tag-pill",
      });
      view.focus();
    }, true);

    return node;
  }

  ignoreEvent() {
    return false;
  }
}

class FrontmatterTagListWidget extends WidgetType {
  constructor(private readonly list: FrontmatterTagList) {
    super();
  }

  eq(other: FrontmatterTagListWidget) {
    return other.list.from === this.list.from
      && other.list.to === this.list.to
      && other.list.tags.map((tag) => tag.text).join("\0") === this.list.tags.map((tag) => tag.text).join("\0");
  }

  toDOM() {
    const node = document.createElement("span");
    node.className = "cm-frontmatter-tag-list";

    if (!this.list.tags.length) {
      const empty = document.createElement("span");
      empty.className = "cm-frontmatter-tag-list-empty";
      empty.textContent = "No tags";
      node.appendChild(empty);
      node.setAttribute("aria-label", "No tags");
      return node;
    }

    for (const tag of this.list.tags) {
      const pill = document.createElement("span");
      pill.textContent = tag.text;
      pill.className = "cm-tag-pill" + (tag.kind === "workflow"
        ? " cm-tag-pill-workflow"
        : tag.kind === "todo"
          ? " cm-tag-pill-todo"
          : " cm-tag-pill-custom");
      node.appendChild(pill);
    }
    node.setAttribute("aria-label", `Tags: ${this.list.tags.map((tag) => tag.text).join(", ")}`);
    return node;
  }

  ignoreEvent() {
    return false;
  }
}

export function buildTagPillDecorations(view: EditorView): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const selection = view.state.selection;
  const doc = view.state.doc.toString();
  const frontmatterLists = collectFrontmatterTagLists(doc);

  for (const list of frontmatterLists) {
    const visible = view.visibleRanges.some((range) => range.from <= list.from && list.to <= range.to);
    if (!visible || selectionTouchesTag(selection, list.from, list.to)) continue;
    ranges.push(Decoration.replace({
      widget: new FrontmatterTagListWidget(list),
      side: 1,
    }).range(list.from, list.to));
  }

  for (const match of collectTagMatches(doc)) {
    if (frontmatterLists.some((list) => list.from <= match.from && match.to <= list.to)) continue;
    const visible = view.visibleRanges.some((range) => range.from <= match.from && match.to <= range.to);
    if (!visible) continue;
    if (selectionTouchesTag(selection, match.from, match.to)) continue;
    ranges.push(Decoration.replace({ widget: new TagPillWidget(match), side: 1 }).range(match.from, match.to));
  }

  return Decoration.set(ranges, true);
}

export const tagPillPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildTagPillDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildTagPillDecorations(update.view);
      }
    }
  },
  { decorations: (value) => value.decorations },
);
