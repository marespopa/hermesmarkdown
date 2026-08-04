import type { Node as ProseNode } from "@milkdown/kit/prose/model";
import type { EditorView, NodeView } from "@milkdown/kit/prose/view";
import { NodeSelection } from "@milkdown/kit/prose/state";
import { InputRule } from "@milkdown/kit/prose/inputrules";
import { $nodeSchema, $view, $inputRule, $remark } from "@milkdown/kit/utils";
import remarkMath from "remark-math";
let katexPromise: Promise<any> | null = null;
import { isSelectionInside } from "./node-view-utils";

// Wires remark-math (mdast "inlineMath"/"math" nodes, backed by
// mdast-util-math) into Milkdown's markdown parse/stringify pipeline —
// same mechanism preset-gfm uses for remark-gfm itself. Required
// separately from the two node schemas below: the schemas describe how a
// ProseMirror node round-trips to/from an already-parsed mdast node, this
// is what makes the parser recognize `$...$`/`$$...$$` syntax at all.
export const remarkMathPlugin = $remark("remarkMath", () => remarkMath);

export const inlineMathSchema = $nodeSchema("inline_math", () => ({
  group: "inline",
  inline: true,
  atom: true,
  attrs: { value: { default: "" } },
  parseDOM: [
    {
      tag: 'span[data-type="inline-math"]',
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) return false;
        return { value: dom.dataset.value || "" };
      },
    },
  ],
  toDOM: (node) => ["span", { "data-type": "inline-math", "data-value": node.attrs.value }, `$${node.attrs.value}$`],
  // mdast-util-math's stringifier is what guarantees this round-trips as
  // literal `$value$` — not a custom encoding — as long as the node's
  // `value` attr is passed through untouched in both directions.
  parseMarkdown: {
    match: ({ type }) => type === "inlineMath",
    runner: (state, node, type) => {
      state.addNode(type, { value: node.value ?? "" });
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === "inline_math",
    runner: (state, node) => {
      state.addNode("inlineMath", undefined, node.attrs.value ?? "");
    },
  },
}));

export const mathBlockSchema = $nodeSchema("math_block", () => ({
  group: "block",
  atom: true,
  defining: true,
  isolating: true,
  attrs: { value: { default: "" } },
  parseDOM: [
    {
      tag: 'div[data-type="math-block"]',
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) return false;
        return { value: dom.dataset.value || "" };
      },
    },
  ],
  toDOM: (node) => ["div", { "data-type": "math-block", "data-value": node.attrs.value }, `$$${node.attrs.value}$$`],
  parseMarkdown: {
    match: ({ type }) => type === "math",
    runner: (state, node, type) => {
      state.addNode(type, { value: node.value ?? "" });
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === "math_block",
    runner: (state, node) => {
      state.addNode("math", undefined, node.attrs.value ?? "");
    },
  },
}));

// Typing a closing "$" converts whatever sits between it and the nearest
// preceding "$" into a live formula, rendered as you type. Deliberately
// simple (no lookbehind excluding "$$"), so it will
// occasionally misfire on plain-text dollar amounts like "$5 and $10" —
// a known rough edge of naive $...$ matching, not attempted to be
// disambiguated here; the user can undo (Cmd/Ctrl-Z) if it misfires.
export const inlineMathInputRule = $inputRule((ctx) =>
  new InputRule(/\$([^$\n]+)\$$/, (state, match, start, end) => {
    const node = inlineMathSchema.type(ctx).createChecked({ value: match[1] });
    return state.tr.replaceWith(start, end, node);
  }),
);

// Both inline and block math need the identical "render a live formula;
// click it (or land the selection on it, e.g. right after insertion) to
// swap to a plain editable text box; commit on blur/Enter/Escape" behavior
// — this NodeView is shared and parameterized by `displayMode` rather than
// duplicated, since unlike CodeBlockView/CalloutBlockquoteView the two
// cases really are the same interaction (atom node holding a `value`
// string), just inline vs block KaTeX rendering.
class MathView implements NodeView {
  dom: HTMLElement;
  private node: ProseNode;
  private rendered: HTMLElement;
  private input: HTMLInputElement | HTMLTextAreaElement | null = null;
  private editing = false;

  constructor(
    node: ProseNode,
    private view: EditorView,
    private getPos: () => number | undefined,
    private displayMode: boolean,
  ) {
    this.node = node;
    const wrapper = document.createElement(displayMode ? "div" : "span");
    wrapper.className = displayMode
      ? "math-block not-prose my-4 overflow-x-auto rounded-lg border border-edge px-3 py-2 cursor-text"
      : "math-inline not-prose cursor-text";
    this.dom = wrapper;

    const rendered = document.createElement(displayMode ? "div" : "span");
    rendered.contentEditable = "false";
    wrapper.appendChild(rendered);
    this.rendered = rendered;

    wrapper.addEventListener("mousedown", (e) => {
      if (this.editing) return;
      e.preventDefault();
      const pos = this.getPos();
      if (pos == null) return;
      this.view.dispatch(this.view.state.tr.setSelection(NodeSelection.create(this.view.state.doc, pos)));
      this.view.focus();
    });

    this.renderMath();
    this.syncEditState();
  }

  private async renderMath() {
    const value = this.node.attrs.value || "";
    if (!value.trim()) {
      this.rendered.textContent = this.displayMode ? "Empty formula" : "$…$";
      this.rendered.className = "text-fg-faint italic";
      return;
    }
    try {
      const katex = await (katexPromise ??= import("katex").then((m) => (m.default ? m.default : m)));
      this.rendered.innerHTML = katex.renderToString(value, { throwOnError: true, displayMode: this.displayMode });
      this.rendered.className = "";
    } catch (err) {
      this.rendered.textContent = value;
      this.rendered.className = "text-red-500 dark:text-red-400 font-mono text-ui-footnote";
    }
  }

  private syncEditState() {
    if (this.editing) return;
    const pos = this.getPos();
    const inside = pos != null && isSelectionInside(this.view, pos, this.node.nodeSize);
    if (inside) this.enterEditMode();
  }

  private enterEditMode() {
    if (this.editing) return;
    this.editing = true;
    this.rendered.style.display = "none";
    const input = document.createElement(this.displayMode ? "textarea" : "input");
    if (input instanceof HTMLInputElement) input.type = "text";
    if (input instanceof HTMLTextAreaElement) input.rows = 3;
    input.value = this.node.attrs.value || "";
    input.className = "math-edit-input block w-full min-w-[6ch] bg-transparent outline-none font-mono text-ui-footnote resize-none";
    input.addEventListener("mousedown", (e) => e.stopPropagation());
    input.addEventListener("keydown", (evt: Event) => {
      const e = evt as KeyboardEvent;
      if (e.key === "Enter" && !this.displayMode) {
        e.preventDefault();
        this.commitAndExit(input.value, true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.commitAndExit(input.value, true);
      }
    });
    input.addEventListener("blur", () => this.commitAndExit(input.value, false));
    this.dom.appendChild(input);
    this.input = input;
    input.focus();
    if (!this.displayMode) input.select();
  }

  private commitAndExit(value: string, refocusEditor: boolean) {
    if (!this.input) return;
    this.input.remove();
    this.input = null;
    this.editing = false;
    this.rendered.style.display = "";
    const pos = this.getPos();
    if (pos != null && value !== this.node.attrs.value) {
      this.view.dispatch(this.view.state.tr.setNodeMarkup(pos, undefined, { value }));
    } else {
      this.renderMath();
    }
    if (refocusEditor) this.view.focus();
  }

  update(node: ProseNode): boolean {
    if (node.type !== this.node.type) return false;
    const valueChanged = node.attrs.value !== this.node.attrs.value;
    this.node = node;
    if (this.editing) {
      if (valueChanged && this.input) this.input.value = node.attrs.value || "";
    } else {
      if (valueChanged) this.renderMath();
      this.syncEditState();
    }
    return true;
  }

  stopEvent(event: Event): boolean {
    return event.target === this.input;
  }

  ignoreMutation(): boolean {
    return true;
  }
}

export const inlineMathView = $view(
  inlineMathSchema.node,
  () => (node, view, getPos) => new MathView(node, view, getPos, false),
);

export const mathBlockView = $view(
  mathBlockSchema.node,
  () => (node, view, getPos) => new MathView(node, view, getPos, true),
);
