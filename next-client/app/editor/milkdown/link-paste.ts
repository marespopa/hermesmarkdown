import type { Ctx } from "@milkdown/kit/ctx";
import { Plugin, PluginKey, TextSelection } from "@milkdown/kit/prose/state";
import { $prose } from "@milkdown/kit/utils";
import { linkSchema } from "@milkdown/kit/preset/commonmark";

const REGEX_URL_PASTE = /^(https?:\/\/[^\s]+)$/i;

// Matches use-codemirror-features.ts/handlePasteTransform's bare-URL paste
// behavior in Source mode: pasting a lone URL (nothing else on the
// clipboard) inserts it as a link with a "link" placeholder label, selected
// so the user can immediately type over it with a real title. Left to
// Milkdown/@milkdown/plugin-clipboard's own defaults, a bare URL paste in
// Preview just autolinks the raw text with no editable title — this
// restores that parity. Registered ahead of clipboard/clipboardCopyFix in
// EditablePreview.tsx so its handlePaste is checked first.
export const linkPastePlugin = $prose((ctx: Ctx) => {
  return new Plugin({
    key: new PluginKey("LINK_PASTE"),
    props: {
      handlePaste(view, event) {
        const text = event.clipboardData?.getData("text/plain")?.trim();
        if (!text || !REGEX_URL_PASTE.test(text)) return false;
        const { state } = view;
        if (state.selection.$from.parent.type.spec.code) return false;

        const linkMark = linkSchema.type(ctx).create({ href: text });
        const node = state.schema.text("link", [linkMark]);
        const { from } = state.selection;
        const tr = state.tr.replaceSelectionWith(node, false);
        tr.setSelection(TextSelection.create(tr.doc, from, from + node.nodeSize));
        view.dispatch(tr);
        event.preventDefault();
        return true;
      },
    },
  });
});
