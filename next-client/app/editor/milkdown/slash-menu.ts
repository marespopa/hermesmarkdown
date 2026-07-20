import type { Ctx } from "@milkdown/kit/ctx";
import type { EditorView } from "@milkdown/kit/prose/view";
import type { PluginSpec } from "@milkdown/kit/prose/state";
import { parserCtx } from "@milkdown/kit/core";
import { wrapInList } from "@milkdown/kit/prose/schema-list";
import { wrapIn, setBlockType } from "@milkdown/kit/prose/commands";
import { slashFactory, SlashProvider } from "@milkdown/kit/plugin/slash";
import { TextSelection } from "@milkdown/kit/prose/state";
import { headingSchema, bulletListSchema, orderedListSchema, codeBlockSchema, blockquoteSchema } from "@milkdown/kit/preset/commonmark";
import { extendListItemSchemaForTask } from "@milkdown/kit/preset/gfm";
import { SHORTCODES } from "../components/constants";

interface SlashRange {
  from: number;
  to: number;
}

interface SlashCommand {
  title: string;
  keywords: string[];
  run: (ctx: Ctx, view: EditorView, range: SlashRange) => void;
}

function deleteRange(view: EditorView, range: SlashRange) {
  if (range.to > range.from) view.dispatch(view.state.tr.delete(range.from, range.to));
}

function insertBlock(ctx: Ctx, view: EditorView, range: SlashRange, block: import("@milkdown/kit/prose/model").Node) {
  view.dispatch(view.state.tr.replaceWith(range.from, range.to, block));
}

const CALLOUT_TYPES = ["note", "tip", "warning"] as const;

function buildCommands(): SlashCommand[] {
  return [
    {
      title: "Heading 1",
      keywords: ["h1", "heading1", "heading"],
      run: (ctx, view, range) => {
        deleteRange(view, range);
        setBlockType(headingSchema.type(ctx), { level: 1 })(view.state, view.dispatch);
      },
    },
    {
      title: "Heading 2",
      keywords: ["h2", "heading2"],
      run: (ctx, view, range) => {
        deleteRange(view, range);
        setBlockType(headingSchema.type(ctx), { level: 2 })(view.state, view.dispatch);
      },
    },
    {
      title: "Heading 3",
      keywords: ["h3", "heading3"],
      run: (ctx, view, range) => {
        deleteRange(view, range);
        setBlockType(headingSchema.type(ctx), { level: 3 })(view.state, view.dispatch);
      },
    },
    {
      title: "Bullet List",
      keywords: ["ul", "bullet", "list", "unordered"],
      run: (ctx, view, range) => {
        deleteRange(view, range);
        wrapInList(bulletListSchema.type(ctx))(view.state, view.dispatch);
      },
    },
    {
      title: "Ordered List",
      keywords: ["ol", "ordered", "numbered"],
      run: (ctx, view, range) => {
        deleteRange(view, range);
        wrapInList(orderedListSchema.type(ctx))(view.state, view.dispatch);
      },
    },
    {
      title: "Task List",
      keywords: ["todo", "task", "checkbox"],
      run: (ctx, view, range) => {
        const listItemType = extendListItemSchemaForTask.type(ctx);
        const bulletListType = bulletListSchema.type(ctx);
        const item = listItemType.createChecked(
          { label: "•", listType: "bullet", spread: "false", checked: false },
          view.state.schema.nodes.paragraph.createChecked(),
        );
        insertBlock(ctx, view, range, bulletListType.createChecked({ spread: "false" }, item));
      },
    },
    {
      title: "Table",
      keywords: ["table", "grid"],
      run: (ctx, view, range) => {
        const parsed = ctx.get(parserCtx)(SHORTCODES["{table}"]());
        if (parsed) insertBlock(ctx, view, range, parsed.content as unknown as import("@milkdown/kit/prose/model").Node);
      },
    },
    {
      title: "Code Block",
      keywords: ["code", "codeblock"],
      run: (ctx, view, range) => {
        deleteRange(view, range);
        setBlockType(codeBlockSchema.type(ctx))(view.state, view.dispatch);
      },
    },
    {
      title: "Quote",
      keywords: ["quote", "blockquote"],
      run: (ctx, view, range) => {
        deleteRange(view, range);
        wrapIn(blockquoteSchema.type(ctx))(view.state, view.dispatch);
      },
    },
    ...CALLOUT_TYPES.map((type) => ({
      title: `Callout: ${type[0].toUpperCase()}${type.slice(1)}`,
      keywords: ["callout", type],
      run: (ctx: Ctx, view: EditorView, range: SlashRange) => {
        const blockquoteType = blockquoteSchema.type(ctx);
        const marker = `[!${type}] `;
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

const MENU_ITEM_CLASS = "w-full text-left px-3 py-1.5 rounded-sm text-ui-body cursor-pointer";
const MENU_ITEM_SELECTED_CLASS = "bg-paper-softgray dark:bg-paper-dark-surface";

function createSlashPluginSpec(ctx: Ctx): Partial<PluginSpec<unknown>> {
  const commands = buildCommands();
  let filtered = commands;
  let selectedIndex = 0;
  let range: SlashRange | null = null;

  const content = document.createElement("div");
  content.className =
    "z-50 w-56 max-h-72 overflow-y-auto py-1 bg-paper-light dark:bg-paper-dark border border-edge rounded-md shadow-lg";
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
    const text = $from.parent.textBetween(
      Math.max(0, $from.parentOffset - 500),
      $from.parentOffset,
      undefined,
      "￼",
    );
    return /\/(\S*)$/.test(text);
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
    filtered.forEach((cmd, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = cmd.title;
      btn.className = `${MENU_ITEM_CLASS} ${i === selectedIndex ? MENU_ITEM_SELECTED_CLASS : ""}`;
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
        const match = text?.match(/\/(\S*)$/);
        if (!match) {
          range = null;
          return;
        }
        const query = match[1].toLowerCase();
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
