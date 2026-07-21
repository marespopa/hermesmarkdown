import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";
import { REGEX_TODO_TAGS, REGEX_TODO_STATUS_TAGS } from "../components/regex";
import { TAG_COLORS, TAG_CYCLE, TODO_CYCLE, TODO_TAGS } from "../components/constants";

// Port of the Source editor's lifecycle-tag coloring + cycling (see
// use-codemirror-features.ts's handleWorkflowCycle/handleTodoCycle) —
// #draft/#review/#active/#archived and #todo/#prog/#done tags get the same
// colored, bold, clickable treatment in Rendered view. Source mode shows a
// prev/next popup on cursor-hover; this is a single click that always
// advances to the next state, which is simpler to build as a plain
// decoration + handleClick (no floating menu) and covers the common case
// (click to advance) — the docs' "CLICK ‹ #tag ›" shortcut still applies,
// just without the reverse direction here.
function matchesFor(text: string) {
  const matches: { start: number; end: number; tag: string; isWorkflow: boolean }[] = [];
  for (const m of text.matchAll(REGEX_TODO_TAGS)) {
    matches.push({ start: m.index!, end: m.index! + m[0].length, tag: m[1].toLowerCase(), isWorkflow: true });
  }
  for (const m of text.matchAll(REGEX_TODO_STATUS_TAGS)) {
    matches.push({ start: m.index!, end: m.index! + m[0].length, tag: m[1].toLowerCase(), isWorkflow: false });
  }
  return matches;
}

export const lifecycleTagDecorations = $prose(() => {
  return new Plugin({
    key: new PluginKey("LIFECYCLE_TAG"),
    props: {
      decorations(state) {
        const decos: Decoration[] = [];
        state.doc.descendants((node, pos) => {
          if (!node.isText || !node.text) return;
          for (const m of matchesFor(node.text)) {
            const colorClass = TAG_COLORS[m.tag] ?? "";
            decos.push(
              Decoration.inline(pos + m.start, pos + m.end, { class: `${colorClass} font-bold cursor-pointer` }),
            );
          }
        });
        return DecorationSet.create(state.doc, decos);
      },
      handleClick(view, pos) {
        const $pos = view.state.doc.resolve(pos);
        const text = $pos.parent.textContent;
        const offset = $pos.parentOffset;
        const match = matchesFor(text).find((m) => offset >= m.start && offset <= m.end);
        if (!match) return false;

        const cycle = match.isWorkflow ? TAG_CYCLE : TODO_CYCLE;
        const nextTagName = cycle[match.tag];
        if (!nextTagName) return false;
        const nextTag = `#${nextTagName}`;

        const parentStart = $pos.start();
        const from = parentStart + match.start;
        const to = parentStart + match.end;
        let tr = view.state.tr.insertText(nextTag, from, to);

        // #todo/#prog/#done tags mirror the checkbox on their own line in
        // Source mode too — but here the checkbox is a real list_item
        // `checked` attr, not raw "[ ]"/"[x]" text, so sync that instead
        // of splicing a character.
        if (!match.isWorkflow && TODO_TAGS.includes(match.tag)) {
          for (let d = $pos.depth; d >= 0; d--) {
            const node = $pos.node(d);
            if (node.type.name !== "list_item" || node.attrs.checked == null) continue;
            const itemPos = $pos.before(d);
            tr = tr.setNodeMarkup(itemPos, undefined, { ...node.attrs, checked: nextTagName === "done" });
            break;
          }
        }

        view.dispatch(tr);
        return true;
      },
    },
  });
});
