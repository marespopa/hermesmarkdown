import { StateEffect, StateField, type Range } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from "@codemirror/view";
import { fieldLabel } from "@/app/utils/templates/template-fields";
import { isPreviewMode, previewModeChanged } from "./preview-facet";
import { selectionTouchesLink } from "./link-display";

// In a template note, `{{date}}` / `{{prompt:Owner}}` read as plain-language
// pills ("Today's date", "Ask: Owner"). The source shows while the caret or
// selection touches it, like links. Unknown tokens stay as typed.

export const setTemplateNote = StateEffect.define<boolean>();

export const templateNoteField = StateField.define<boolean>({
  create: () => false,
  update: (value, tr) => tr.effects.reduce((current, effect) => (effect.is(setTemplateNote) ? effect.value : current), value),
});

const TOKEN = /\{\{\s*(prompt:[^}\n]*|[A-Za-z]+)\s*\}\}/g;

export interface TemplateFieldMatch {
  from: number;
  to: number;
  label: string;
}

export function collectTemplateFields(doc: string): TemplateFieldMatch[] {
  const matches: TemplateFieldMatch[] = [];
  for (const match of doc.matchAll(TOKEN)) {
    const label = fieldLabel(match[1]);
    if (label) matches.push({ from: match.index, to: match.index + match[0].length, label });
  }
  return matches;
}

class TemplateFieldWidget extends WidgetType {
  constructor(private readonly label: string, private readonly isQuestion: boolean) {
    super();
  }

  eq(other: TemplateFieldWidget) {
    return other.label === this.label;
  }

  toDOM() {
    const node = document.createElement("span");
    node.textContent = this.label;
    node.className = `cm-template-field${this.isQuestion ? " cm-template-field-ask" : ""}`;
    node.title = "Template field: filled in when the template is used. Click to edit.";
    return node;
  }

  ignoreEvent() {
    return false;
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  if (!view.state.field(templateNoteField, false)) return Decoration.none;
  const reveal = !isPreviewMode(view.state);
  const ranges: Range<Decoration>[] = [];
  for (const { from, to } of view.visibleRanges) {
    for (const match of collectTemplateFields(view.state.sliceDoc(from, to))) {
      const start = from + match.from;
      const end = from + match.to;
      if (reveal && selectionTouchesLink(view.state.selection, start, end)) continue;
      const widget = new TemplateFieldWidget(match.label, match.label.startsWith("Ask: "));
      ranges.push(Decoration.replace({ widget }).range(start, end));
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
      if (toggled || update.docChanged || update.selectionSet || update.viewportChanged || previewModeChanged(update)) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (value) => value.decorations },
);

export const templateFieldPills = [templateNoteField, templateFieldPillPlugin];
