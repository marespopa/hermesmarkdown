import { EditorSelection, StateEffect, StateField, type EditorState, type Range } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { fieldLabel, humanizeBlank } from "@/app/utils/templates/template-fields";
import { isBlankToken, parseTemplateToken, templateTokenRegex } from "@/app/utils/templates/template-tokens";
import { isPreviewMode, previewModeChanged } from "./preview-facet";
import { selectionTouchesLink } from "./link-display";

// Fields read as pills instead of `{{…}}` syntax. In a template note every
// field does ("Today's date", "Ask: Owner", "Fill in: Task 1"); in any other
// note only blanks left by a template (`{{task_1}}` → "Task 1"), which Tab
// jumps between (template-blanks.ts). Code is left alone. The source shows
// while the caret or selection touches it, like links.

export const setTemplateNote = StateEffect.define<boolean>();

export const templateNoteField = StateField.define<boolean>({
  create: () => false,
  update: (value, tr) => tr.effects.reduce((current, effect) => (effect.is(setTemplateNote) ? effect.value : current), value),
});

export type TemplateFieldKind = "field" | "ask" | "blank";

export interface TemplateFieldMatch {
  from: number;
  to: number;
  label: string;
  kind: TemplateFieldKind;
}

export function collectTemplateFields(doc: string, { blanksOnly = false } = {}): TemplateFieldMatch[] {
  const matches: TemplateFieldMatch[] = [];
  for (const match of doc.matchAll(templateTokenRegex())) {
    const inner = match[1];
    const blank = isBlankToken(inner);
    if (blanksOnly && !blank) continue;
    const label = blanksOnly ? humanizeBlank(parseTemplateToken(inner)!.name) : fieldLabel(inner);
    if (!label) continue;
    const kind: TemplateFieldKind = blank ? "blank" : inner.trim().startsWith("prompt:") ? "ask" : "field";
    matches.push({ from: match.index, to: match.index + match[0].length, label, kind });
  }
  return matches;
}

// Inside fenced or inline code.
export function isInCode(state: EditorState, pos: number): boolean {
  for (let node: ReturnType<typeof syntaxTree>["topNode"] | null = syntaxTree(state).resolveInner(pos, 1); node; node = node.parent) {
    if (/Code/.test(node.name)) return true;
  }
  return false;
}

class TemplateFieldWidget extends WidgetType {
  constructor(private readonly label: string, private readonly kind: TemplateFieldKind) {
    super();
  }

  eq(other: TemplateFieldWidget) {
    return other.label === this.label && other.kind === this.kind;
  }

  toDOM() {
    const node = document.createElement("span");
    node.textContent = this.label;
    node.className = `cm-template-field cm-template-field-${this.kind}`;
    node.title = this.kind === "blank"
      ? "Blank to fill in. Tab jumps between blanks."
      : "Template field: filled in when the template is used. Click to edit.";
    return node;
  }

  ignoreEvent() {
    return false;
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const isTemplate = view.state.field(templateNoteField, false) ?? false;
  const reveal = !isPreviewMode(view.state);
  const ranges: Range<Decoration>[] = [];
  for (const { from, to } of view.visibleRanges) {
    for (const match of collectTemplateFields(view.state.sliceDoc(from, to), { blanksOnly: !isTemplate })) {
      const start = from + match.from;
      const end = from + match.to;
      if (reveal && selectionTouchesLink(view.state.selection, start, end)) continue;
      if (isInCode(view.state, start)) continue;
      ranges.push(Decoration.replace({ widget: new TemplateFieldWidget(match.label, match.kind) }).range(start, end));
    }
  }
  return Decoration.set(ranges, true);
}

const templateFieldPillPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      const toggled = update.startState.field(templateNoteField, false) !== update.state.field(templateNoteField, false);
      const treeChanged = syntaxTree(update.startState) !== syntaxTree(update.state);
      if (toggled || treeChanged || update.docChanged || update.selectionSet || update.viewportChanged || previewModeChanged(update)) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (value) => value.decorations,
    eventHandlers: {
      // Clicking a blank selects all of it, so typing replaces it.
      mousedown(event, view) {
        const pill = (event.target as HTMLElement).closest?.(".cm-template-field-blank");
        if (!pill) return false;
        const pos = view.posAtDOM(pill);
        const line = view.state.doc.lineAt(pos);
        const match = collectTemplateFields(line.text, { blanksOnly: true })
          .find((m) => line.from + m.from <= pos && pos <= line.from + m.to);
        if (!match) return false;
        event.preventDefault();
        view.dispatch({ selection: EditorSelection.range(line.from + match.from, line.from + match.to), userEvent: "select.pointer" });
        view.focus();
        return true;
      },
    },
  },
);

export const templateFieldPills = [templateNoteField, templateFieldPillPlugin];
