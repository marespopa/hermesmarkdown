import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";
import { REGEX_TODO_TAGS, REGEX_TODO_STATUS_TAGS } from "../components/regex";
import { TAG_COLORS } from "../components/constants";

// Port of the Source editor's lifecycle-tag coloring (see
// use-codemirror-features.ts) — #draft/#review/#active/#archived and
// #todo/#prog/#done tags get the same colored, bold, clickable treatment in
// Rendered view. The cycling/picker UI itself lives in
// lifecycle-tag-callout-plugin.ts, mirroring the split between coloring
// (here) and the selection-driven popup (there) that Source mode also has.
export function matchesFor(text: string) {
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
    },
  });
});
