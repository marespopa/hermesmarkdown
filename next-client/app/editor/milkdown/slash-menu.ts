import type { Ctx } from "@milkdown/kit/ctx";
import type { EditorView } from "@milkdown/kit/prose/view";
import type { PluginSpec } from "@milkdown/kit/prose/state";
import { parserCtx } from "@milkdown/kit/core";
import { $ctx } from "@milkdown/kit/utils";
import { wrapInList } from "@milkdown/kit/prose/schema-list";
import { wrapIn, setBlockType } from "@milkdown/kit/prose/commands";
import { slashFactory, SlashProvider } from "@milkdown/kit/plugin/slash";
import { TextSelection, NodeSelection } from "@milkdown/kit/prose/state";
import { headingSchema, bulletListSchema, orderedListSchema, codeBlockSchema, blockquoteSchema, linkSchema, inlineCodeSchema } from "@milkdown/kit/preset/commonmark";
import { SHORTCODES } from "../components/constants";
import { CALLOUT_META } from "../constants/callouts";
import { mathBlockSchema } from "./math-schema";

// Bridges this vanilla-DOM slash menu to the React-side link dialog the
// same way onWikiLinkClickCtx/onTableCalloutUpdateCtx bridge their plugins:
// the callback receives an `insert` closure that already has ctx/view/range
// captured, so the React dialog only needs to call it with (label, url)
// once the user confirms — it doesn't need its own way to reach ProseMirror.
export const onOpenLinkDialogCtx = $ctx<((insert: (label: string, url: string) => void) => void) | undefined, "onOpenLinkDialog">(
  undefined,
  "onOpenLinkDialog",
);

export function configureOpenLinkDialog(ctx: Ctx, onOpenLinkDialog?: (insert: (label: string, url: string) => void) => void) {
  ctx.set(onOpenLinkDialogCtx.key, onOpenLinkDialog);
}

// Same bridge pattern as onOpenLinkDialogCtx above, but the insert closure
// only takes the chosen note name — WikiLinkDialog resolves that name
// against atom_fileMetadata itself.
export const onOpenWikiLinkDialogCtx = $ctx<((insert: (name: string) => void) => void) | undefined, "onOpenWikiLinkDialog">(
  undefined,
  "onOpenWikiLinkDialog",
);

export function configureOpenWikiLinkDialog(ctx: Ctx, onOpenWikiLinkDialog?: (insert: (name: string) => void) => void) {
  ctx.set(onOpenWikiLinkDialogCtx.key, onOpenWikiLinkDialog);
}

interface SlashRange {
  from: number;
  to: number;
}

type SlashCategory = "Text" | "Lists" | "Insert" | "Callouts";

interface SlashCommand {
  title: string;
  description: string;
  category: SlashCategory;
  keywords: string[];
  // Either a small inline SVG string or plain text badge (e.g. "H1") —
  // this menu is built with vanilla DOM (see createSlashPluginSpec), not
  // React, so icons are markup strings rather than components.
  icon: string;
  run: (ctx: Ctx, view: EditorView, range: SlashRange) => void;
}

function deleteRange(view: EditorView, range: SlashRange) {
  if (range.to > range.from) view.dispatch(view.state.tr.delete(range.from, range.to));
}

function insertBlock(ctx: Ctx, view: EditorView, range: SlashRange, block: import("@milkdown/kit/prose/model").Node) {
  view.dispatch(view.state.tr.replaceWith(range.from, range.to, block));
}

const CALLOUT_TYPES = ["note", "tip", "warning"] as const;

// Small, reused-across-rows icon set — outline style matching the chevron
// already used elsewhere in this file's sibling plugins.ts (stroke-based,
// 24x24 viewBox), kept as plain SVG strings rather than react-icons
// components since this menu is hand-built DOM, not React.
const ICON = {
  list: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor" stroke="none"/></svg>',
  orderedList: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><text x="2" y="9" font-size="7" fill="currentColor" stroke="none">1</text><text x="2" y="15" font-size="7" fill="currentColor" stroke="none">2</text><text x="2" y="21" font-size="7" fill="currentColor" stroke="none">3</text></svg>',
  checkbox: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="1.5"/><polyline points="4.5 7 6.5 9 9.5 5"/><line x1="14" y1="7" x2="21" y2="7"/><line x1="14" y1="17" x2="21" y2="17"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></svg>',
  table: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="1.5"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="16" x2="21" y2="16"/><line x1="11" y1="4" x2="11" y2="20"/></svg>',
  code: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="8 6 3 12 8 18"/><polyline points="16 6 21 12 16 18"/></svg>',
  sigma: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 5H7l6 7-6 7h11"/></svg>',
  quote: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 8c-2 0-3.5 1.6-3.5 4S5 16 7 16"/><path d="M17 8c-2 0-3.5 1.6-3.5 4S15 16 17 16"/></svg>',
  link: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-2.83 2.83a5 5 0 0 0 7.07 7.07l1.5-1.5"/></svg>',
  wikilink: '<span class="text-[11px] font-bold tabular-nums">[[ ]]</span>',
};

// A "/" only opens the menu at the start of a line or right after a space
// (same boundary rule as the raw-markdown editor's validBoundary in
// ../codemirror/slash-menu.ts) — otherwise moving the cursor into existing
// text like "api.kraken.com/0/public" re-triggers the menu on every "/".
function matchSlashTrigger(text: string): RegExpMatchArray | null {
  const match = text.match(/\/(\S*)$/);
  if (!match) return null;
  const idx = match.index ?? text.length - match[0].length;
  if (idx > 0 && text[idx - 1] !== " ") return null;
  return match;
}

function headingIcon(level: 1 | 2 | 3): string {
  return `<span class="text-[11px] font-bold tabular-nums">H${level}</span>`;
}

function calloutIcon(type: (typeof CALLOUT_TYPES)[number]): string {
  const meta = CALLOUT_META[type] ?? CALLOUT_META.note;
  return `<span class="inline-block w-2.5 h-2.5 rounded-full ${meta.border.replace("border-", "bg-")}"></span>`;
}

function buildCommands(): SlashCommand[] {
  return [
    {
      title: "Heading 1",
      description: "Large section heading",
      category: "Text",
      keywords: ["h1", "heading1", "heading"],
      icon: headingIcon(1),
      run: (ctx, view, range) => {
        deleteRange(view, range);
        setBlockType(headingSchema.type(ctx), { level: 1 })(view.state, view.dispatch);
      },
    },
    {
      title: "Heading 2",
      description: "Medium section heading",
      category: "Text",
      keywords: ["h2", "heading2"],
      icon: headingIcon(2),
      run: (ctx, view, range) => {
        deleteRange(view, range);
        setBlockType(headingSchema.type(ctx), { level: 2 })(view.state, view.dispatch);
      },
    },
    {
      title: "Heading 3",
      description: "Small section heading",
      category: "Text",
      keywords: ["h3", "heading3"],
      icon: headingIcon(3),
      run: (ctx, view, range) => {
        deleteRange(view, range);
        setBlockType(headingSchema.type(ctx), { level: 3 })(view.state, view.dispatch);
      },
    },
    {
      title: "Quote",
      description: "Blockquote for a citation or aside",
      category: "Text",
      keywords: ["quote", "blockquote"],
      icon: ICON.quote,
      run: (ctx, view, range) => {
        deleteRange(view, range);
        wrapIn(blockquoteSchema.type(ctx))(view.state, view.dispatch);
      },
    },
    {
      title: "Bullet List",
      description: "Unordered list",
      category: "Lists",
      keywords: ["ul", "bullet", "list", "unordered"],
      icon: ICON.list,
      run: (ctx, view, range) => {
        deleteRange(view, range);
        wrapInList(bulletListSchema.type(ctx))(view.state, view.dispatch);
      },
    },
    {
      title: "Ordered List",
      description: "Numbered list",
      category: "Lists",
      keywords: ["ol", "ordered", "numbered"],
      icon: ICON.orderedList,
      run: (ctx, view, range) => {
        deleteRange(view, range);
        wrapInList(orderedListSchema.type(ctx))(view.state, view.dispatch);
      },
    },
    {
      title: "Task List",
      description: "Checkbox list item",
      category: "Lists",
      keywords: ["todo", "task", "checkbox"],
      icon: ICON.checkbox,
      run: (ctx, view, range) => {
        deleteRange(view, range);
        const bulletListType = bulletListSchema.type(ctx);
        // wrapInList (same command Bullet List/Ordered List above use) wraps
        // the CURRENT paragraph in place, leaving the cursor exactly where
        // it already was, ready to type. An earlier version instead built
        // a brand-new list+item+empty-paragraph from scratch and inserted
        // it, which left the cursor wherever ProseMirror's default
        // replace-mapping happened to land it — and that untouched,
        // zero-content paragraph got written straight back out through
        // Milkdown's own "preserve empty line" paragraph serializer as a
        // literal "<br />" in the saved markdown until the user's first
        // keystroke. Wrapping the existing paragraph avoids creating that
        // orphan node at all.
        if (!wrapInList(bulletListType)(view.state, view.dispatch)) return;
        // wrapInList only produces a plain bullet list_item (checked: null,
        // no box) — extendListItemSchemaForTask patches that same node
        // type's attrs shape in place rather than defining a separate node
        // (see TaskListItemView's comment), so flipping `checked` to a real
        // boolean here is enough to turn it into a checkbox item; no need
        // to touch the node's type.
        const { $from } = view.state.selection;
        for (let depth = $from.depth; depth >= 0; depth--) {
          const node = $from.node(depth);
          if (node.type.name !== "list_item") continue;
          const pos = $from.before(depth);
          view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, checked: false }));
          break;
        }
      },
    },
    {
      title: "Link",
      description: "Insert a hyperlink",
      category: "Insert",
      keywords: ["link", "url", "hyperlink"],
      icon: ICON.link,
      run: (ctx, view, range) => {
        const onOpenLinkDialog = ctx.get(onOpenLinkDialogCtx.key);
        if (!onOpenLinkDialog) return;
        onOpenLinkDialog((label, url) => {
          const linkMark = linkSchema.type(ctx).create({ href: url });
          const text = view.state.schema.text(label || url, [linkMark]);
          view.dispatch(view.state.tr.replaceWith(range.from, range.to, text));
          view.focus();
        });
      },
    },
    {
      title: "WikiLink",
      description: "Link to another note",
      category: "Insert",
      keywords: ["wikilink", "note", "[["],
      icon: ICON.wikilink,
      run: (ctx, view, range) => {
        const onOpenWikiLinkDialog = ctx.get(onOpenWikiLinkDialogCtx.key);
        if (!onOpenWikiLinkDialog) return;
        onOpenWikiLinkDialog((name) => {
          const text = view.state.schema.text(`[[${name}]]`);
          view.dispatch(view.state.tr.replaceWith(range.from, range.to, text));
          view.focus();
        });
      },
    },
    {
      title: "Table",
      description: "Insert a GFM table",
      category: "Insert",
      keywords: ["table", "grid"],
      icon: ICON.table,
      run: (ctx, view, range) => {
        const parsed = ctx.get(parserCtx)(SHORTCODES["{table}"]());
        if (parsed) insertBlock(ctx, view, range, parsed.content as unknown as import("@milkdown/kit/prose/model").Node);
      },
    },
    {
      title: "Code Block",
      description: "Syntax-highlighted code",
      category: "Insert",
      keywords: ["code", "codeblock"],
      icon: ICON.code,
      run: (ctx, view, range) => {
        deleteRange(view, range);
        setBlockType(codeBlockSchema.type(ctx))(view.state, view.dispatch);
      },
    },
    {
      title: "Math Block",
      description: "LaTeX formula, rendered live",
      category: "Insert",
      keywords: ["math", "latex", "formula", "equation"],
      icon: ICON.sigma,
      run: (ctx, view, range) => {
        const node = mathBlockSchema.type(ctx).createChecked({ value: "" });
        const tr = view.state.tr.replaceWith(range.from, range.to, node);
        // NodeSelection on the freshly-inserted (empty) node puts MathView
        // straight into its edit box — same reasoning as the callout
        // command below, so there's somewhere to type immediately.
        tr.setSelection(NodeSelection.create(tr.doc, range.from));
        view.dispatch(tr);
      },
    },
    ...CALLOUT_TYPES.map((type) => ({
      title: `Callout: ${type[0].toUpperCase()}${type.slice(1)}`,
      description: `${type[0].toUpperCase()}${type.slice(1)} callout box`,
      category: "Callouts" as const,
      keywords: ["callout", type],
      icon: calloutIcon(type),
      run: (ctx: Ctx, view: EditorView, range: SlashRange) => {
        const blockquoteType = blockquoteSchema.type(ctx);
        // "+" marks it foldable-but-expanded (CalloutBlockquoteView shows a
        // chevron for +/-, nothing for a bare marker) — inserted from the
        // slash menu so the fold toggle is available immediately instead of
        // only for callouts the user hand-typed with a +/- suffix.
        const marker = `[!${type}]+ `;
        const text = view.state.schema.text(marker);
        // A trailing hardbreak gives the callout a second "> " row for the
        // body, matching Obsidian's own layout (title line, then content).
        // calloutMarkerDecorations hides everything through this hardbreak,
        // so the body the user types after it renders as normal visible
        // text on its own line, not appended onto the hidden title line.
        const hardbreak = view.state.schema.nodes.hardbreak.createChecked();
        const para = view.state.schema.nodes.paragraph.createChecked(null, [text, hardbreak]);
        const block = blockquoteType.createChecked(null, para);
        const tr = view.state.tr.replaceWith(range.from, range.to, block);
        // replaceWith alone leaves the mapped selection wherever ProseMirror's
        // default mapping lands it, which is often just past the inserted
        // block rather than inside the paragraph — so the cursor can't type
        // into the callout until the user clicks it manually. Explicitly
        // place it right after the hardbreak, inside the paragraph: +1 to
        // enter the blockquote, +1 to enter the paragraph, then past the
        // marker and hardbreak, ready to type the callout body.
        const cursorPos = Math.min(
          range.from + 2 + marker.length + hardbreak.nodeSize,
          tr.doc.content.size,
        );
        tr.setSelection(TextSelection.near(tr.doc.resolve(cursorPos)));
        view.dispatch(tr);
      },
    })),
  ];
}

const MENU_ITEM_CLASS =
  "w-full text-left px-2.5 py-1.5 rounded-lg text-ui-body cursor-pointer flex items-center gap-2.5";
const MENU_ITEM_SELECTED_CLASS = "bg-paper-softgray dark:bg-paper-dark-surface";
const CATEGORY_LABEL_CLASS =
  "px-2.5 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted dark:text-stone select-none";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Wraps the substring of `title` that matched the typed query in a <mark>,
// so filtering gives visible feedback on WHY a row matched (e.g. typing
// "tbl" against "Table" — the query can match keywords, not just the
// title, so there may be nothing to highlight; that's fine, it's a bonus
// cue, not the only feedback).
function highlightMatch(title: string, query: string): string {
  if (!query) return escapeHtml(title);
  const idx = title.toLowerCase().indexOf(query);
  if (idx === -1) return escapeHtml(title);
  const before = escapeHtml(title.slice(0, idx));
  const match = escapeHtml(title.slice(idx, idx + query.length));
  const after = escapeHtml(title.slice(idx + query.length));
  return `${before}<mark class="bg-transparent text-sage font-semibold">${match}</mark>${after}`;
}

function createSlashPluginSpec(ctx: Ctx): Partial<PluginSpec<unknown>> {
  const commands = buildCommands();
  let filtered = commands;
  let query = "";
  let selectedIndex = 0;
  let range: SlashRange | null = null;

  const content = document.createElement("div");
  content.className =
    "z-50 w-72 max-h-80 overflow-y-auto py-1.5 bg-paper-light dark:bg-paper-dark border border-edge rounded-2xl shadow-lg";
  content.style.position = "absolute";
  content.style.display = "none";

  // The plugin's default shouldShow only checks whether the last typed
  // character is the trigger ("/"), so it hides the moment a filter query
  // is typed after it (e.g. "/tab"). Match the same "/query" pattern used
  // by the view.update handler below, so the menu stays open while filtering.
  const shouldShow = (view: EditorView): boolean => {
    const isSlashChildren = content.contains(document.activeElement);
    const notHasFocus = !view.hasFocus() && !isSlashChildren;
    if (notHasFocus || !view.editable) return false;
    const { selection } = view.state;
    if (!(selection instanceof TextSelection) || !selection.empty) return false;
    const { $from } = selection;
    if ($from.parent.type.name !== "paragraph") return false;
    const marks = $from.marks();
    if (linkSchema.type(ctx).isInSet(marks) || inlineCodeSchema.type(ctx).isInSet(marks)) return false;
    const text = $from.parent.textBetween(
      Math.max(0, $from.parentOffset - 500),
      $from.parentOffset,
      undefined,
      "￼",
    );
    return !!matchSlashTrigger(text);
  };

  const provider = new SlashProvider({ content, trigger: "/", shouldShow });
  provider.onShow = () => {
    content.style.display = "block";
  };
  provider.onHide = () => {
    content.style.display = "none";
  };

  function execute(view: EditorView) {
    const cmd = filtered[selectedIndex];
    if (!cmd || !range) return;
    cmd.run(ctx, view, range);
    provider.hide();
  }

  function render(view: EditorView) {
    content.innerHTML = "";
    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "px-3 py-1.5 text-ui-footnote text-ink-muted dark:text-stone";
      empty.textContent = "No matches";
      content.appendChild(empty);
      return;
    }
    let lastCategory: SlashCategory | null = null;
    filtered.forEach((cmd, i) => {
      if (cmd.category !== lastCategory) {
        lastCategory = cmd.category;
        const label = document.createElement("div");
        label.className = CATEGORY_LABEL_CLASS;
        label.textContent = cmd.category;
        content.appendChild(label);
      }

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `${MENU_ITEM_CLASS} ${i === selectedIndex ? MENU_ITEM_SELECTED_CLASS : ""}`;

      const iconWrap = document.createElement("span");
      iconWrap.className = "shrink-0 w-5 h-5 flex items-center justify-center text-ink-muted dark:text-stone";
      iconWrap.innerHTML = cmd.icon;
      btn.appendChild(iconWrap);

      const textWrap = document.createElement("span");
      textWrap.className = "min-w-0 flex-1 flex flex-col";
      const titleEl = document.createElement("span");
      titleEl.className = "truncate";
      titleEl.innerHTML = highlightMatch(cmd.title, query);
      const descEl = document.createElement("span");
      descEl.className = "truncate text-ui-footnote text-ink-muted dark:text-stone";
      descEl.textContent = cmd.description;
      textWrap.appendChild(titleEl);
      textWrap.appendChild(descEl);
      btn.appendChild(textWrap);

      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        selectedIndex = i;
        execute(view);
      });
      content.appendChild(btn);
    });
  }

  return {
    view: () => ({
      update: (view: EditorView, prevState?: import("@milkdown/kit/prose/state").EditorState) => {
        provider.update(view, prevState);
        const text = provider.getContent(view);
        const match = text ? matchSlashTrigger(text) : null;
        if (!match) {
          range = null;
          return;
        }
        query = match[1].toLowerCase();
        const to = view.state.selection.from;
        range = { from: to - match[0].length, to };
        filtered = query
          ? commands.filter((c) => c.title.toLowerCase().includes(query) || c.keywords.some((k) => k.includes(query)))
          : commands;
        selectedIndex = 0;
        render(view);
      },
      destroy: () => {
        provider.destroy();
        content.remove();
      },
    }),
    props: {
      handleKeyDown: (view: EditorView, event: KeyboardEvent) => {
        if (content.style.display === "none") return false;
        if (event.key === "ArrowDown") {
          selectedIndex = Math.min(selectedIndex + 1, filtered.length - 1);
          render(view);
          event.preventDefault();
          return true;
        }
        if (event.key === "ArrowUp") {
          selectedIndex = Math.max(selectedIndex - 1, 0);
          render(view);
          event.preventDefault();
          return true;
        }
        if (event.key === "Enter") {
          execute(view);
          event.preventDefault();
          return true;
        }
        if (event.key === "Escape") {
          provider.hide();
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
  };
}

export const slashMenu = slashFactory("EditablePreviewSlash");

export function configureSlashMenu(ctx: Ctx) {
  ctx.set(slashMenu.key, createSlashPluginSpec(ctx));
}
