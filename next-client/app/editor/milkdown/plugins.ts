import { InputRule } from "@milkdown/kit/prose/inputrules";
import type { Node as ProseNode } from "@milkdown/kit/prose/model";
import type { EditorView, NodeView, ViewMutationRecord } from "@milkdown/kit/prose/view";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { parserCtx } from "@milkdown/kit/core";
import { $inputRule, $prose, $view } from "@milkdown/kit/utils";
import { extendListItemSchemaForTask } from "@milkdown/kit/preset/gfm";
import { bulletListSchema, blockquoteSchema, htmlSchema } from "@milkdown/kit/preset/commonmark";
import { SHORTCODES } from "../components/constants";
import { REGEX_CALC } from "../components/regex";
import { CALLOUT_META, resolveCalloutType } from "../constants/callouts";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// {table} expands to block-level markdown (a GFM table) — inserting that
// as literal inline text would leave a dead, unstructured line in the
// doc, so it runs through the markdown parser and gets inserted as a real
// table node instead of plain text.
const PARSE_AS_MARKDOWN_SHORTCODES = new Set(["{table}"]);

// {todo}/{done} are checkboxes with nothing typed after them yet — GFM's
// task-list-item syntax isn't recognized by the markdown parser without
// trailing content on the line, so an empty "- [ ] " round-trips back as
// a plain list item containing the literal text "[ ]" rather than a real
// checkbox. Built directly as a task list_item node instead.
const TASK_SHORTCODES: Record<string, boolean> = { "{todo}": false, "{done}": true };

// Port of shortcode-expand.ts's SHORTCODES map (`..d`, `{date}`, `{todo}`,
// etc.) as ProseMirror input rules — same "text immediately before the
// cursor equals the code" trigger, fired on the last typed character.
export const shortcodeInputRules = Object.entries(SHORTCODES).map(([code, getValue]) =>
  $inputRule(
    (ctx) =>
      new InputRule(new RegExp(`${escapeRegExp(code)}$`), (state, _match, start, end) => {
        if (code in TASK_SHORTCODES) {
          const listItemType = extendListItemSchemaForTask.type(ctx);
          const bulletListType = bulletListSchema.type(ctx);
          const item = listItemType.createChecked(
            { label: "•", listType: "bullet", spread: "false", checked: TASK_SHORTCODES[code] },
            state.schema.nodes.paragraph.createChecked(),
          );
          const list = bulletListType.createChecked({ spread: "false" }, item);
          return state.tr.replaceWith(start, end, list);
        }

        const value = getValue();
        if (PARSE_AS_MARKDOWN_SHORTCODES.has(code)) {
          const parsed = ctx.get(parserCtx)(value);
          if (parsed) return state.tr.replaceWith(start, end, parsed.content);
        }
        return state.tr.insertText(value, start, end);
      }),
  ),
);

// Port of shortcode-expand.ts's calc()= evaluator.
export const calcInputRule = $inputRule(
  () =>
    new InputRule(REGEX_CALC, (state, match, start, end) => {
      const normalized = match[1].replace(/(\d),(\d+)/g, (_, pre, post) =>
        post.length <= 2 ? `${pre}.${post}` : `${pre}${post}`,
      );
      const sanitized = normalized.replace(/[^-()\d/*+.]/g, "");
      try {
        // eslint-disable-next-line no-new-func
        const result = new Function(`return (${sanitized})`)();
        const replacement = (Math.round(result * 100) / 100).toString();
        return state.tr.insertText(replacement, start, end);
      } catch {
        return null;
      }
    }),
);

// GFM's task-list-item schema extends the plain commonmark list_item node
// in place (same node id) rather than defining a separate node type, so
// this NodeView handles both: an untouched <li> for plain list items
// (node.attrs.checked == null), and a checkbox + content split for task
// items — gfm's own toDOM only emits data-checked attributes with no
// visible box or click-to-toggle behavior.
class TaskListItemView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private checkbox: HTMLInputElement | null = null;
  private node: ProseNode;

  constructor(
    node: ProseNode,
    private view: EditorView,
    private getPos: () => number | undefined,
  ) {
    this.node = node;
    const li = document.createElement("li");
    this.dom = li;

    if (node.attrs.checked == null) {
      this.contentDOM = li;
      return;
    }

    li.className = "task-list-item list-none";
    // Inline styles (not just Tailwind classes) so the row layout can't
    // lose to the `prose` typography plugin's own `li`/`p` display rules.
    // paddingLeft/marginLeft are zeroed because the plugin reserves that
    // space for the `::marker` we no longer render (list-none) — without
    // this the checkbox sits far right of where the bullet used to be.
    li.style.display = "flex";
    li.style.alignItems = "flex-start";
    li.style.gap = "0.5rem";
    li.style.paddingLeft = "0";
    li.style.marginLeft = "0";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!node.attrs.checked;
    checkbox.contentEditable = "false";
    checkbox.className = "cursor-pointer accent-sage";
    // Paragraph margins inside task items are zeroed via
    // EditablePreview's `[&_.task-list-item_p]:my-0`, so this only needs
    // to offset the checkbox's own height against the text line-height.
    checkbox.style.marginTop = "0.3em";
    checkbox.style.flexShrink = "0";
    // Prevents ProseMirror from stealing focus/selection on click while
    // still letting the browser toggle the checkbox and fire "change".
    checkbox.addEventListener("mousedown", (e) => e.preventDefault());
    checkbox.addEventListener("change", () => {
      const pos = this.getPos();
      if (pos == null) return;
      this.view.dispatch(
        this.view.state.tr.setNodeMarkup(pos, undefined, {
          ...this.node.attrs,
          checked: checkbox.checked,
        }),
      );
    });
    this.checkbox = checkbox;
    li.appendChild(checkbox);

    const content = document.createElement("div");
    content.style.flex = "1";
    content.style.minWidth = "0";
    li.appendChild(content);
    this.contentDOM = content;
  }

  update(node: ProseNode): boolean {
    if (node.type !== this.node.type) return false;
    if ((node.attrs.checked == null) !== (this.node.attrs.checked == null)) return false;
    this.node = node;
    if (this.checkbox) this.checkbox.checked = !!node.attrs.checked;
    return true;
  }

  stopEvent(event: Event): boolean {
    return event.target === this.checkbox;
  }

  ignoreMutation(mutation: ViewMutationRecord): boolean {
    if (mutation.type === "selection") return false;
    return !this.contentDOM.contains(mutation.target as Node);
  }
}

export const taskListItemView = $view(
  extendListItemSchemaForTask.node,
  () => (node, view, getPos) => new TaskListItemView(node, view, getPos),
);

const REGEX_BR_TAG = /^<br\s*\/?>$/i;

// remark-parse turns raw inline HTML it can't otherwise interpret into an
// "html" passthrough node, which the commonmark preset's default toDOM
// renders as literal visible text (e.g. the string "<br />"). A <br> tag
// is the standard workaround for line breaks inside GFM table cells (which
// can't hold a real newline), so it shows up in real files — displaying it
// as raw markup instead of an actual line break reads as broken/messy in
// Rendered view. This NodeView renders just that one case as a real <br>
// element; anything else keeps the default literal-text rendering, since
// arbitrary inline HTML isn't otherwise supported here.
class HtmlPassthroughView implements NodeView {
  dom: HTMLElement;

  constructor(node: ProseNode) {
    const value = String(node.attrs.value ?? "");
    if (REGEX_BR_TAG.test(value.trim())) {
      this.dom = document.createElement("br");
      return;
    }
    const span = document.createElement("span");
    span.textContent = value;
    span.dataset.type = "html";
    this.dom = span;
  }

  ignoreMutation(): boolean {
    return true;
  }
}

export const htmlPassthroughView = $view(
  htmlSchema.node,
  () => (node) => new HtmlPassthroughView(node),
);

const REGEX_CALLOUT_MARKER = /^\[!(\w+)\]([+-]?)/i;

// Obsidian-style callouts (`> [!note] Title`) are, to the schema, just a
// plain blockquote whose first paragraph happens to start with a
// "[!type]" marker — same as Preview.tsx's read-only rendering, no schema
// or parser changes needed. This NodeView is a pure view-layer transform:
// the marker text stays in the real doc/paragraph (so it's still
// editable and round-trips as plain markdown), only the box gets colored
// and a type label is added above it.
//
// contentDOM is always the same nested <div>, never swapped for `quote`
// itself. Typing the "[!note] " marker character-by-character flips
// detectType() from null to "note" mid-keystroke, inside the very node
// being typed into — if contentDOM's identity changed at that moment,
// ProseMirror would tear down and rebuild the view while a native input
// event was still in flight, and the browser's own contentEditable
// mutation could land in the old (about-to-be-destroyed) DOM, surviving
// as a duplicated, unmanaged text node next to the freshly rendered one.
// Keeping contentDOM stable means update() never needs to return false
// for a type change, so that teardown never happens.
class CalloutBlockquoteView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private node: ProseNode;
  private label: HTMLElement | null = null;
  private currentType: string | null = null;

  constructor(
    node: ProseNode,
    private view: EditorView,
    private getPos: () => number | undefined,
  ) {
    this.node = node;
    const quote = document.createElement("blockquote");
    this.dom = quote;

    const content = document.createElement("div");
    quote.appendChild(content);
    this.contentDOM = content;

    const type = this.detectType(node);
    this.applyCalloutState(type, type ? this.detectTitle(node, type) : "");
  }

  private detectType(node: ProseNode): string | null {
    const first = node.firstChild;
    if (!first || first.type.name !== "paragraph") return null;
    const m = first.textContent.match(REGEX_CALLOUT_MARKER);
    if (!m) return null;
    return resolveCalloutType(m[1]);
  }

  // Title = the rest of the first line after the marker, up to the first
  // hardbreak (a soft-wrapped `>` continuation becomes a hardbreak node)
  // or end of paragraph if there's no body. Falls back to the capitalized
  // type name for a bare "[!note]" with nothing typed after it yet.
  private detectTitle(node: ProseNode, type: string): string {
    const first = node.firstChild;
    if (!first) return type;
    const fullText = first.textContent;
    const m = fullText.match(REGEX_CALLOUT_MARKER);
    if (!m) return type;

    let charsBeforeBreak = fullText.length;
    let sawBreak = false;
    let consumed = 0;
    first.forEach((child) => {
      if (sawBreak) return;
      if (child.type.name === "hardbreak") {
        charsBeforeBreak = consumed;
        sawBreak = true;
        return;
      }
      consumed += child.textContent.length;
    });

    const markerLen = m[0].length + (fullText[m[0].length] === " " ? 1 : 0);
    const title = fullText.slice(markerLen, charsBeforeBreak).trim();
    return title || `${type[0].toUpperCase()}${type.slice(1)}`;
  }

  private applyCalloutState(type: string | null, title: string) {
    if (type !== this.currentType) {
      this.currentType = type;

      if (!type) {
        this.dom.className = "";
        if (this.label) {
          this.label.remove();
          this.label = null;
        }
        return;
      }

      const meta = CALLOUT_META[type] ?? CALLOUT_META.note;
      this.dom.className = `callout-box not-prose my-4 rounded-lg border-l-2 px-4 py-3 ${meta.border} ${meta.bg} ${meta.text}`;

      if (!this.label) {
        const label = document.createElement("div");
        label.contentEditable = "false";
        label.className = "font-semibold text-ui-body mb-1.5";
        this.label = label;
        this.dom.insertBefore(label, this.contentDOM);
      }
    }

    if (type && this.label) this.label.textContent = title;
  }

  update(node: ProseNode): boolean {
    if (node.type !== this.node.type) return false;
    this.node = node;
    const type = this.detectType(node);
    this.applyCalloutState(type, type ? this.detectTitle(node, type) : "");
    return true;
  }

  ignoreMutation(mutation: ViewMutationRecord): boolean {
    if (mutation.type === "selection") return false;
    return !this.contentDOM.contains(mutation.target as Node);
  }
}

export const calloutBlockquoteView = $view(
  blockquoteSchema.node,
  () => (node, view, getPos) => new CalloutBlockquoteView(node, view, getPos),
);

// CalloutBlockquoteView's box/label are decorative additions around the
// real content — the "[!note] " marker text itself is still sitting
// right there in the first paragraph (that's what keeps it editable and
// round-trippable). This hides just that marker substring visually via
// an inline Decoration (a view-only overlay, doesn't touch the doc), so
// the title reads as plain text the way Preview.tsx's read-only version
// already does. Paired with `[&_.callout-marker-hidden]:hidden` on
// EditablePreview's wrapper.
export const calloutMarkerDecorations = $prose(() => {
  return new Plugin({
    key: new PluginKey("CALLOUT_MARKER_HIDE"),
    props: {
      decorations(state) {
        const decos: Decoration[] = [];
        state.doc.descendants((node, pos) => {
          if (node.type.name !== "blockquote") return;
          const first = node.firstChild;
          if (!first || first.type.name !== "paragraph") return;
          const text = first.textContent;
          const m = text.match(REGEX_CALLOUT_MARKER);
          if (!m) return;
          const paraContentStart = pos + 2;

          // The whole first line ("[!note] Title") is hidden from the
          // body — CalloutBlockquoteView's label already shows the title,
          // so leaving it visible here too would show it twice. Hidden
          // through the trailing hardbreak (a soft-wrapped `>`
          // continuation becomes a hardbreak node) so no blank line is
          // left behind before the body starts.
          let hideEnd = paraContentStart + first.content.size;
          let offset = paraContentStart;
          first.forEach((child) => {
            if (hideEnd !== paraContentStart + first.content.size) return;
            offset += child.nodeSize;
            if (child.type.name === "hardbreak") hideEnd = offset;
          });
          decos.push(Decoration.inline(paraContentStart, hideEnd, { class: "callout-marker-hidden" }));
        });
        return DecorationSet.create(state.doc, decos);
      },
    },
  });
});
