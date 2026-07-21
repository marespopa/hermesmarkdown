import type { Ctx } from "@milkdown/kit/ctx";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { $ctx, $prose } from "@milkdown/kit/utils";
import { REGEX_WIKILINK } from "../components/regex";

// Matches app/editor/hooks/use-codemirror-features.ts's Ctrl/Cmd+click
// behavior for [[wikilinks]] in the CodeMirror editor — same modifier
// requirement, same resolver callback (openFileByName), just wired
// through a ProseMirror plugin instead of a raw DOM mousedown listener
// since GFM/commonmark has no concept of wikilinks as a node/mark; they're
// just literal "[[Name]]" text.
export const onWikiLinkClickCtx = $ctx<((name: string) => void) | undefined, "onWikiLinkClick">(
  undefined,
  "onWikiLinkClick",
);

export function configureWikiLinkClick(ctx: Ctx, onWikiLinkClick?: (name: string) => void) {
  ctx.set(onWikiLinkClickCtx.key, onWikiLinkClick);
}

export const wikiLinkClickPlugin = $prose((ctx) => {
  return new Plugin({
    key: new PluginKey("WIKILINK_CLICK"),
    props: {
      decorations(state) {
        const decos: Decoration[] = [];
        state.doc.descendants((node, pos) => {
          if (!node.isText || !node.text) return;
          for (const m of node.text.matchAll(REGEX_WIKILINK)) {
            const from = pos + m.index!;
            decos.push(Decoration.inline(from, from + m[0].length, { class: "wikilink-text" }));
          }
        });
        return DecorationSet.create(state.doc, decos);
      },
      handleClick(view, pos, event) {
        if (!event.ctrlKey && !event.metaKey) return false;
        const onWikiLinkClick = ctx.get(onWikiLinkClickCtx.key);
        if (!onWikiLinkClick) return false;

        const $pos = view.state.doc.resolve(pos);
        const text = $pos.parent.textContent;
        const offset = $pos.parentOffset;
        for (const m of text.matchAll(REGEX_WIKILINK)) {
          const start = m.index ?? -1;
          const end = start + m[0].length;
          if (offset >= start && offset <= end) {
            event.preventDefault();
            onWikiLinkClick(m[1]);
            return true;
          }
        }
        return false;
      },
    },
  });
});

// Plain Markdown links (`[text](url)`) render as real `<a href>` elements
// via commonmark's linkSchema — inside a contentEditable doc that means a
// bare click risks the browser navigating away mid-edit instead of just
// placing the cursor, which is the opposite of what someone editing text
// through a link wants. Same Ctrl/Cmd+click convention as the wikilink
// plugin above (and the Source-mode CodeMirror editor): a plain click
// always just positions the cursor, only a modifier click opens it — in a
// new tab, since navigating the editor itself away would lose the note.
export const linkClickPlugin = $prose(() => {
  return new Plugin({
    key: new PluginKey("LINK_CLICK"),
    props: {
      handleClick(view, pos, event) {
        const $pos = view.state.doc.resolve(pos);
        const linkMark = $pos.marks().find((m) => m.type.name === "link");
        if (!linkMark) return false;

        // Always prevent the browser's own <a> navigation — ProseMirror
        // already placed the cursor from the click before handleClick
        // runs, so this only blocks the page from leaving underneath it.
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) {
          const href = linkMark.attrs.href as string | undefined;
          if (href) window.open(href, "_blank", "noopener,noreferrer");
        }
        return true;
      },
    },
  });
});
