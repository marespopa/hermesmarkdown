import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { IconType } from "react-icons";
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

function applyTaskState(node: HTMLElement, state: string) {
  node.dataset.state = state === " " ? "open" : state === "/" ? "progress" : state === "-" ? "cancelled" : "done";
  node.setAttribute("aria-checked", state === "x" ? "true" : state === "/" ? "mixed" : "false");
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
    node.setAttribute("role", "checkbox");
    applyTaskState(node, this.state);
    const box = node.appendChild(document.createElement("span"));
    box.className = "cm-liveTask-box";
    node.addEventListener("mousedown", (event) => {
      event.preventDefault();
      toggleTaskBox(view, view.posAtDOM(node));
    });
    return node;
  }

  // Reuses the box when the state changes, so ticking it plays the tick
  // animation; a freshly drawn box (opening a note, scrolling) stays still.
  updateDOM(dom: HTMLElement): boolean {
    const wasDone = dom.dataset.state === "done";
    applyTaskState(dom, this.state);
    dom.classList.remove("cm-liveTask-ticked");
    if (!wasDone && dom.dataset.state === "done") {
      void dom.offsetWidth; // restart the animation on quick re-ticks
      dom.classList.add("cm-liveTask-ticked");
    }
    return true;
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

// Each callout icon's SVG, rendered once from its react-icons component.
const iconMarkup = new Map<IconType, string>();

function calloutIconMarkup(Icon: IconType): string {
  let markup = iconMarkup.get(Icon);
  if (markup === undefined) {
    markup = renderToStaticMarkup(createElement(Icon, { "aria-hidden": true, focusable: "false" }));
    iconMarkup.set(Icon, markup);
  }
  return markup;
}

// A callout's `> [!type]` prefix, shown as the type's icon and name in its
// colour. Clicking it puts the caret at the line's start, which reveals the syntax.
export class CalloutLabelWidget extends WidgetType {
  constructor(readonly label: string, readonly colorClass: string, readonly icon: IconType) {
    super();
  }

  eq(other: CalloutLabelWidget) {
    return other.label === this.label && other.colorClass === this.colorClass && other.icon === this.icon;
  }

  toDOM(view: EditorView) {
    const node = document.createElement("span");
    node.className = `cm-calloutLabel ${this.colorClass}`;
    const icon = node.appendChild(document.createElement("span"));
    icon.className = "cm-calloutIcon";
    icon.innerHTML = calloutIconMarkup(this.icon);
    node.appendChild(document.createTextNode(this.label));
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
