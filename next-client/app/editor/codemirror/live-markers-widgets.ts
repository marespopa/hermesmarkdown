import { EditorView, WidgetType } from "@codemirror/view";

// Widgets live-markers.ts draws in place of Markdown syntax.

const LIST_INDENT_EM_PER_COLUMN = 0.75;
// A bullet's or task's box is as wide as "- ", whatever the marker's spacing.
export const BULLET_COLUMNS = 2;

export const em = (columns: number) => `${columns * LIST_INDENT_EM_PER_COLUMN}em`;

export class BulletWidget extends WidgetType {
  constructor(readonly depth: number) {
    super();
  }

  eq(other: BulletWidget) {
    return other.depth === this.depth;
  }

  toDOM() {
    const node = document.createElement("span");
    node.className = "cm-liveBullet";
    node.style.width = em(BULLET_COLUMNS);
    node.textContent = this.depth % 2 === 0 ? "•" : "◦";
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  ignoreEvent() {
    return false;
  }
}

// `state` is the character between the brackets.
export class TaskBoxWidget extends WidgetType {
  constructor(readonly state: string) {
    super();
  }

  eq(other: TaskBoxWidget) {
    return other.state === this.state;
  }

  toDOM(view: EditorView) {
    const node = document.createElement("span");
    node.className = "cm-liveTask";
    node.style.width = em(BULLET_COLUMNS);
    node.dataset.state = this.state === " " ? "open" : this.state === "/" ? "progress" : this.state === "-" ? "cancelled" : "done";
    node.setAttribute("role", "checkbox");
    node.setAttribute("aria-checked", this.state === "x" ? "true" : this.state === "/" ? "mixed" : "false");
    const box = node.appendChild(document.createElement("span"));
    box.className = "cm-liveTask-box";
    node.addEventListener("mousedown", (event) => {
      event.preventDefault();
      toggleTaskBox(view, view.posAtDOM(node));
    });
    return node;
  }

  ignoreEvent() {
    return true;
  }
}

// Ticks the task whose widget starts at `markerFrom`, or clears a done one.
export function toggleTaskBox(view: EditorView, markerFrom: number): boolean {
  const line = view.state.doc.lineAt(markerFrom);
  const bracket = line.text.indexOf("[", markerFrom - line.from);
  if (bracket < 0) return false;
  const at = line.from + bracket + 1;
  const current = view.state.doc.sliceString(at, at + 1);
  view.dispatch({
    changes: { from: at, to: at + 1, insert: current.toLowerCase() === "x" ? " " : "x" },
    userEvent: "input.outline.task",
  });
  return true;
}

// A callout's `> [!type]` prefix, shown as the type's name in its colour.
// Clicking it puts the caret at the line's start, which reveals the syntax.
export class CalloutLabelWidget extends WidgetType {
  constructor(readonly label: string, readonly colorClass: string) {
    super();
  }

  eq(other: CalloutLabelWidget) {
    return other.label === this.label && other.colorClass === this.colorClass;
  }

  toDOM(view: EditorView) {
    const node = document.createElement("span");
    node.className = `cm-calloutLabel ${this.colorClass}`;
    node.textContent = this.label;
    node.addEventListener("mousedown", (event) => {
      event.preventDefault();
      const from = view.state.doc.lineAt(view.posAtDOM(node)).from;
      view.dispatch({ selection: { anchor: from }, userEvent: "select.callout" });
      view.focus();
    });
    return node;
  }

  ignoreEvent() {
    return true;
  }
}

// A fenced block's language, in the corner of its opening row.
export class CodeLanguageWidget extends WidgetType {
  constructor(readonly language: string) {
    super();
  }

  eq(other: CodeLanguageWidget) {
    return other.language === this.language;
  }

  toDOM() {
    const node = document.createElement("span");
    node.className = "cm-codeLanguage";
    node.textContent = this.language;
    return node;
  }

  ignoreEvent() {
    return false;
  }
}
