import { EditorState, type Range } from "@codemirror/state";
import { Decoration, WidgetType } from "@codemirror/view";
import { parseFmFields } from "@/app/utils/frontmatter-utils";
import { findFrontmatterFoldRange, isFrontmatterFolded } from "./frontmatter-fold";
import { buildTagMatch, tagPillClassName, type TagMatch } from "./tag-pills";

export interface PreviewProperty {
  key: string;
  value: string;
}

// The frontmatter's fields in order, as Preview shows them. List values
// (`tags: [a, b]`, `- a` items) come back comma-joined, block scalars keep
// their line breaks.
export function previewProperties(doc: string): PreviewProperty[] {
  return Object.entries(parseFmFields(doc)).map(([key, value]) => ({ key, value }));
}

// Expanded frontmatter in Preview: a read-only key / value grid in place of
// the YAML, with `tags` as tag pills. Collapsed frontmatter keeps its
// summary row, so the grid only replaces the block while it's expanded.
class FrontmatterPropertiesWidget extends WidgetType {
  constructor(readonly properties: PreviewProperty[]) {
    super();
  }

  eq(other: FrontmatterPropertiesWidget) {
    return other.properties.length === this.properties.length
      && other.properties.every((p, i) => p.key === this.properties[i].key && p.value === this.properties[i].value);
  }

  toDOM() {
    const grid = document.createElement("dl");
    grid.className = "cm-previewProperties";
    grid.setAttribute("aria-label", "Properties");
    for (const { key, value } of this.properties) {
      const term = document.createElement("dt");
      term.textContent = key;
      const detail = document.createElement("dd");
      fillValue(detail, key, value);
      grid.append(term, detail);
    }
    return grid;
  }

  ignoreEvent() {
    return false;
  }
}

function fillValue(detail: HTMLElement, key: string, value: string) {
  if (!value) {
    detail.className = "cm-previewProperties-empty";
    detail.textContent = "—";
    return;
  }
  if (key === "tags") {
    const tags = value.split(",").map((raw) => buildTagMatch(raw, 0, 0)).filter((tag): tag is TagMatch => tag !== null);
    if (tags.length) {
      detail.className = "cm-previewProperties-tags";
      for (const tag of tags) {
        const pill = document.createElement("span");
        pill.className = tagPillClassName(tag.kind);
        pill.textContent = tag.text;
        detail.append(pill);
      }
      return;
    }
  }
  detail.textContent = value;
}

// The grid decoration for Preview, or nothing when the note has no
// frontmatter, no fields, or the block is collapsed to its summary row.
export function frontmatterPreviewDecorations(state: EditorState, ranges: Range<Decoration>[]) {
  if (isFrontmatterFolded(state)) return;
  const doc = state.doc.toString();
  const range = findFrontmatterFoldRange(doc);
  if (!range) return;
  const properties = previewProperties(doc);
  if (!properties.length) return;
  ranges.push(
    Decoration.replace({ block: true, widget: new FrontmatterPropertiesWidget(properties) })
      // Through the blank lines after it, as collapsing does, so the gap
      // below is the grid's margin alone.
      .range(range.bodyFrom, range.bodyTo),
  );
}
