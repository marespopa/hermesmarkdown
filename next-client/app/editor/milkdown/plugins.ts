import type { Ctx } from "@milkdown/kit/ctx";
import { InputRule } from "@milkdown/kit/prose/inputrules";
import type { Node as ProseNode } from "@milkdown/kit/prose/model";
import type { EditorView, NodeView, ViewMutationRecord } from "@milkdown/kit/prose/view";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { Plugin, PluginKey, TextSelection } from "@milkdown/kit/prose/state";
import { parserCtx, commandsCtx, schemaCtx, serializerCtx } from "@milkdown/kit/core";
import { setBlockType, splitBlock } from "@milkdown/kit/prose/commands";
import { splitListItem } from "@milkdown/kit/prose/schema-list";
import { $command, $inputRule, $prose, $useKeymap, $view } from "@milkdown/kit/utils";
import { extendListItemSchemaForTask } from "@milkdown/kit/preset/gfm";
import {
  bulletListSchema,
  blockquoteSchema,
  htmlSchema,
  headingSchema,
  paragraphSchema,
  headingKeymap,
} from "@milkdown/kit/preset/commonmark";
import { SHORTCODES } from "../components/constants";
import { REGEX_CALC } from "../components/regex";
import { CALLOUT_META, resolveCalloutType } from "../constants/callouts";
import { unescapeKnownMarkdownPatterns } from "./markdown-escape";

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

// preset-commonmark's default heading keymap binds Backspace/Delete to
// "DowngradeHeading": pressing either at the very start of a heading
// decrements its level (H2 -> H1, H1 -> paragraph), independent of the
// literal "#"/"##" markdown syntax. That makes Backspace-merging the line
// above an H2 (or Delete-merging the line below an H1) silently promote
// the heading a level — surprising since nothing about the heading's own
// text changed. Disabled here by clearing the shortcut list for that one
// binding while leaving the Mod-Alt-N "turn into H1..6" shortcuts intact;
// collapseEmptyHeadingKeymap below replaces it with Notion's behavior.
export function configureHeadingKeymap(ctx: Ctx) {
  ctx.update(headingKeymap.key, (keys) => ({
    ...keys,
    DowngradeHeading: { ...keys.DowngradeHeading, shortcuts: [] },
  }));
}

// Mirrors how Notion treats Backspace/Delete at a heading boundary: an
// EMPTY heading first peels off its heading formatting (becomes a plain
// paragraph) rather than merging into its neighbor — a second
// Backspace/Delete then deletes/merges it as an ordinary empty paragraph
// would. A heading that still has text in it isn't special-cased at all:
// falling through (returning false) lets the default join command run,
// which merges the text into the neighboring block and keeps THAT block's
// type — so deleting the row above an H2 turns the merged line into
// whatever the row above was, never a promoted H1.
const collapseEmptyHeadingCommand = $command("CollapseEmptyHeading", (ctx) => () => (state, dispatch, view) => {
  const { $from, empty } = state.selection;
  if (!empty || $from.parentOffset !== 0) return false;
  const node = $from.parent;
  if (node.type !== headingSchema.type(ctx) || node.content.size > 0) return false;
  return setBlockType(paragraphSchema.type(ctx))(state, dispatch, view);
});

const collapseEmptyHeadingUserKeymap = $useKeymap("collapseEmptyHeading", {
  CollapseEmptyHeading: {
    shortcuts: ["Backspace", "Delete"],
    command: (ctx) => {
      const commands = ctx.get(commandsCtx);
      return () => commands.call(collapseEmptyHeadingCommand.key);
    },
    // Must win the tie against Milkdown's own base Backspace/Delete
    // chain (unspecified priority defaults to 50) so the empty-heading
    // case is caught before the default join command consumes the key.
    priority: 100,
  },
});

export const collapseEmptyHeadingKeymap = [collapseEmptyHeadingCommand, ...collapseEmptyHeadingUserKeymap];

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
    checkbox.style.flexShrink = "0";
    // alignItems: flex-start keeps the box pinned to the row's top edge
    // even when the text wraps to multiple lines; this nudges it back down
    // to sit level with the first line of text instead of the row's edge.
    checkbox.style.marginTop = "0.35rem";
    // Prevents ProseMirror from stealing focus/selection on click while
    // still letting the browser toggle the checkbox and fire "change".
    checkbox.addEventListener("mousedown", (e) => e.preventDefault());
    checkbox.addEventListener("change", () => {
      const pos = this.getPos();
      if (pos == null) return;
      // Not calling tr.scrollIntoView() here is deliberate — Transaction
      // selection maps through automatically by default, so this never
      // moves the cursor; explicitly requesting a scroll would risk
      // yanking the viewport to follow a checkbox the user clicked
      // somewhere they can already see.
      this.view.dispatch(
        this.view.state.tr.setNodeMarkup(pos, undefined, { ...this.node.attrs, checked: checkbox.checked }),
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
// Kept as a literal string (not built from parts) so Tailwind's static
// source scan picks it up and generates the CSS. Hides the whole
// .callout-content div (title stays visible via the separate `label`
// element, which lives outside .callout-content). Deliberately NOT
// ":not(:first-child)" scoped to "children after the first" — a callout's
// body usually isn't a separate block at all: typing a one-line body right
// after "[!note] Title" keeps it in the SAME paragraph as the (already
// content-hidden) marker, joined by the hardbreak calloutMarkerDecorations
// hides through. In that (most common) case .callout-content has exactly
// one child, so "children after the first" hides nothing — the bug this
// replaced. Hiding the container outright covers both that case and
// genuinely multi-block bodies uniformly.
const COLLAPSED_BODY_CLASS = "[&>.callout-content]:hidden";

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
  private chevron: HTMLElement | null = null;
  private currentType: string | null = null;
  private currentFold: "" | "+" | "-" | null = null;
  private foldable = false;
  private collapsed = false;

  constructor(
    node: ProseNode,
    private view: EditorView,
    private getPos: () => number | undefined,
  ) {
    this.node = node;
    const quote = document.createElement("blockquote");
    this.dom = quote;

    const content = document.createElement("div");
    content.className = "callout-content [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:my-0.5";
    quote.appendChild(content);
    this.contentDOM = content;

    const type = this.detectType(node);
    const fold = this.detectFold(node);
    this.applyCalloutState(type, type ? this.detectTitle(node, type) : "", fold);
  }

  private detectType(node: ProseNode): string | null {
    const first = node.firstChild;
    if (!first || first.type.name !== "paragraph") return null;
    const m = first.textContent.match(REGEX_CALLOUT_MARKER);
    if (!m) return null;
    return resolveCalloutType(m[1]);
  }

  private detectFold(node: ProseNode): "" | "+" | "-" {
    const first = node.firstChild;
    if (!first || first.type.name !== "paragraph") return "";
    const m = first.textContent.match(REGEX_CALLOUT_MARKER);
    return (m?.[2] as "" | "+" | "-" | undefined) || "";
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

  private setCollapsed(collapsed: boolean) {
    this.collapsed = collapsed;
    this.dom.classList.toggle(COLLAPSED_BODY_CLASS, collapsed);
    if (this.chevron) this.chevron.style.transform = collapsed ? "" : "rotate(90deg)";
  }

  // The chevron used to only flip the local `collapsed` flag — a purely
  // visual toggle that never touched the saved "+"/"-" in the markdown, so
  // detectFold() (which re-derives fold state from the text on every
  // update()) would snap it right back on the next edit or reload, and
  // there was no way to actually change a callout's fold marker from
  // Preview mode at all (the marker text itself is hidden by
  // calloutMarkerDecorations). This rewrites the "+"/"-" character in the
  // document directly, so the toggle is what gets saved.
  private toggleFold() {
    const pos = this.getPos();
    if (pos == null) return;
    const first = this.node.firstChild;
    if (!first) return;
    const m = first.textContent.match(REGEX_CALLOUT_MARKER);
    if (!m || (m[2] !== "+" && m[2] !== "-")) return;

    const foldCharOffset = m[0].length - m[2].length;
    // +1 to enter the blockquote, +1 to enter the first paragraph.
    const foldCharPos = pos + 2 + foldCharOffset;
    const newFold = m[2] === "+" ? "-" : "+";
    const tr = this.view.state.tr.insertText(newFold, foldCharPos, foldCharPos + 1);
    this.view.dispatch(tr);
  }

  private applyCalloutState(type: string | null, title: string, fold: "" | "+" | "-") {
    const isNewCallout = type !== this.currentType;
    if (isNewCallout) {
      this.currentType = type;

      if (!type) {
        this.dom.className = "";
        if (this.label) {
          this.label.remove();
          this.label = null;
          this.chevron = null;
        }
        this.foldable = false;
        this.setCollapsed(false);
        return;
      }

      const meta = CALLOUT_META[type] ?? CALLOUT_META.note;
      this.dom.className = `callout-box not-prose my-4 rounded-lg border-l-2 px-4 py-3 ${meta.border} ${meta.bg} ${meta.text}`;

      if (!this.label) {
        const label = document.createElement("div");
        label.contentEditable = "false";
        label.className = "font-semibold text-ui-body mb-1.5 flex items-center gap-1.5";
        this.label = label;
        this.dom.insertBefore(label, this.contentDOM);
      }
    }

    if (!type) return;

    this.foldable = fold === "+" || fold === "-";
    if (this.label) {
      if (this.foldable && !this.chevron) {
        const chevron = document.createElement("span");
        chevron.contentEditable = "false";
        chevron.className = "shrink-0 transition-transform cursor-pointer select-none";
        chevron.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>';
        chevron.addEventListener("mousedown", (e) => {
          e.preventDefault();
          this.toggleFold();
        });
        this.label.insertBefore(chevron, this.label.firstChild);
        this.chevron = chevron;
      } else if (!this.foldable && this.chevron) {
        this.chevron.remove();
        this.chevron = null;
      }

      const titleNode = this.label.querySelector(".callout-title-text");
      if (titleNode) {
        titleNode.textContent = title;
      } else {
        const span = document.createElement("span");
        span.className = "callout-title-text";
        span.textContent = title;
        this.label.appendChild(span);
      }
    }

    // Not just `isNewCallout`: toggleFold() rewrites the "+"/"-" character
    // on the SAME callout (type unchanged), so the visual collapsed state
    // has to follow the fold marker whenever it changes too, not only when
    // the callout type itself changes — otherwise the chevron's rotation
    // and the hidden/shown body would silently disagree with what just got
    // written to the document.
    if (isNewCallout || fold !== this.currentFold) this.setCollapsed(fold === "-");
    this.currentFold = fold;
  }

  update(node: ProseNode): boolean {
    if (node.type !== this.node.type) return false;
    this.node = node;
    const type = this.detectType(node);
    const fold = this.detectFold(node);
    this.applyCalloutState(type, type ? this.detectTitle(node, type) : "", fold);
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

// Nested list/blockquote-style structures where an empty, sole child means
// there's genuinely nothing left worth keeping (see emptyAndSole below) —
// headings and tables don't have an equivalent "empty wrapper" shape, so
// that cleanup only applies to these.
const CLEANUP_ON_EMPTY_TYPES = new Set(["blockquote", "bullet_list", "ordered_list"]);

// Shift-Enter inside any structural block (heading, list, callout, table
// cell, …) normally either does nothing special or inserts a hardbreak —
// this repurposes it as an explicit "get me out" escape hatch: exits the
// TOP-LEVEL block the cursor is in (found once, at depth 1, so a list
// nested inside a callout exits the whole callout in one press, not one
// level at a time) and always inserts a fresh empty paragraph right after
// it, landing the cursor there — even if something already follows, so
// there's always a clean blank line between the exited block and whatever
// comes next rather than butting straight up against it. Plain paragraphs
// are left alone (their existing Shift-Enter soft-break behavior is
// unaffected), since there's no "formatting" to exit there. Code blocks and
// math nodes are naturally excluded too — both intercept all their own key
// events via NodeView.stopEvent, so this handler never sees Shift-Enter
// typed inside either (code blocks get the equivalent behavior directly
// from their own CM6 keymap — see code-block-view.ts's exitCodeBlock).
export const exitBlockOnShiftEnter = $prose(() => {
  return new Plugin({
    key: new PluginKey("EXIT_BLOCK_SHIFT_ENTER"),
    props: {
      handleKeyDown(view, event) {
        if (event.key !== "Enter" || !event.shiftKey) return false;
        const { state } = view;
        const { $from } = state.selection;
        if ($from.depth < 1) return false;

        const outerNode = $from.node(1);
        if (outerNode.type.name === "paragraph") return false;

        const outerStart = $from.before(1);
        const outerEnd = $from.after(1);
        const paragraphType = state.schema.nodes.paragraph;

        // If the item/block the cursor is actually in is empty and it's
        // the only child of the thing we're exiting, there's nothing left
        // worth keeping — replace the whole callout/list with a fresh
        // paragraph instead of leaving an empty, still-indented "-" (or
        // an empty ">" callout shell) behind it.
        const emptyAndSole =
          CLEANUP_ON_EMPTY_TYPES.has(outerNode.type.name) &&
          $from.parent.content.size === 0 &&
          outerNode.childCount === 1;

        let tr = state.tr;
        let cursorAt: number;
        if (emptyAndSole) {
          tr = tr.replaceWith(outerStart, outerEnd, paragraphType.createChecked());
          cursorAt = outerStart + 1;
        } else {
          tr = tr.insert(outerEnd, paragraphType.createChecked());
          cursorAt = outerEnd + 1;
        }
        tr.setSelection(TextSelection.near(tr.doc.resolve(cursorAt)));
        view.dispatch(tr.scrollIntoView());
        event.preventDefault();
        return true;
      },
    },
  });
});

// @milkdown/plugin-clipboard's own clipboardTextSerializer runs a copied
// selection through the same remark serializer used for saving (see
// unescapeKnownMarkdownPatterns' doc comment for why that escapes things
// like "> [!note]" and "[[wikilink]]"), but only the save path unwinds
// those escapes — a copy from Render/Preview mode was landing on the
// clipboard still backslash-escaped. ProseMirror's EditorView.someProp
// resolves clipboardTextSerializer to whichever plugin defines it first,
// so this plugin must be registered before `.use(clipboard)` to take
// priority over the built-in one.
export const clipboardCopyFix = $prose((ctx) => {
  return new Plugin({
    key: new PluginKey("HERMES_CLIPBOARD_COPY_FIX"),
    props: {
      clipboardTextSerializer: (slice) => {
        const schema = ctx.get(schemaCtx);
        const serializer = ctx.get(serializerCtx);
        const doc = schema.topNodeType.createAndFill(undefined, slice.content);
        if (!doc) return "";
        return unescapeKnownMarkdownPatterns(serializer(doc));
      },
    },
  });
});

// Milkdown registers no keymap for plain Enter at all (nor, elsewhere in
// this file, does anything but Shift-Enter get one) — everywhere else
// relies on the browser's own contentEditable "split this paragraph"/
// "insert newline" DOM behavior, which ProseMirror then reconciles via its
// mutation observer. That's fine for plain text, but browsers have
// long-standing quirks splitting an inline <a> element specifically, and
// the reconciliation can end up rejecting the result — so pressing Enter or
// Shift-Enter with the cursor inside a link mark visibly did nothing.
// Narrowly intercepted only when a link mark is actually active (so plain-
// paragraph Enter everywhere else keeps its native, undo/IME-friendly
// behavior unchanged), running the split/hardbreak ourselves via an
// explicit transaction instead of leaning on the browser.
export const enterInLinkFix = $prose(() => {
  return new Plugin({
    key: new PluginKey("ENTER_IN_LINK_FIX"),
    props: {
      handleKeyDown(view, event) {
        if (event.key !== "Enter") return false;
        const { state } = view;
        const linkType = state.schema.marks.link;
        if (!linkType) return false;
        if (!linkType.isInSet(state.selection.$from.marks())) return false;

        if (event.shiftKey) {
          const hardbreakType = state.schema.nodes.hardbreak;
          if (!hardbreakType) return false;
          let tr = state.tr.replaceSelectionWith(hardbreakType.create(), true);
          tr = tr.removeStoredMark(linkType);
          view.dispatch(tr.scrollIntoView());
        } else {
          // splitBlock only splits the immediate textblock (the paragraph),
          // not the surrounding list_item — inside a list that leaves two
          // paragraphs stacked in one bullet instead of creating a new one.
          // Reach for schema-list's own list-aware split when the paragraph
          // being split sits inside a list_item.
          const listItemType = state.schema.nodes.list_item;
          const split = listItemType && state.selection.$from.node(-1)?.type === listItemType
            ? splitListItem(listItemType)
            : splitBlock;
          if (!split(state, view.dispatch)) return false;
          view.dispatch(view.state.tr.removeStoredMark(linkType));
        }
        event.preventDefault();
        return true;
      },
    },
  });
});
