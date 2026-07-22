import type { Ctx } from "@milkdown/kit/ctx";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { $ctx, $prose } from "@milkdown/kit/utils";
import { imageSchema } from "@milkdown/kit/preset/commonmark";
import { getImageFile, getImageFromClipboardItems } from "@/app/utils/paste-image";

// Same asset-writing callback the Source-mode editor uses
// (MarkdownEditor.tsx's pasteImageRef / savePastedImage) — wired through a
// ctx slot rather than closed over directly, since this plugin is built
// once by Milkdown's Editor.make() before the React tree with atom access
// exists.
export const onPasteImageCtx = $ctx<((file: File) => Promise<string | null>) | undefined, "onPasteImage">(
  undefined,
  "onPasteImage",
);

export function configurePasteImage(ctx: Ctx, onPasteImage?: (file: File) => Promise<string | null>) {
  ctx.set(onPasteImageCtx.key, onPasteImage);
}

export const imagePastePlugin = $prose((ctx: Ctx) => {
  function insertImage(view: any, file: File, pos?: number): boolean {
    const saveImage = ctx.get(onPasteImageCtx.key);
    if (!saveImage) return false;

    const { state } = view;
    const insertPos = pos ?? state.selection.from;
    saveImage(file).then((src) => {
      if (!src) return;
      const node = imageSchema.type(ctx).create({ src, alt: file.name || "" });
      const tr = view.state.tr.insert(insertPos, node);
      view.dispatch(tr);
    });
    return true;
  }

  return new Plugin({
    key: new PluginKey("IMAGE_PASTE"),
    props: {
      handlePaste(view, event) {
        const file = getImageFromClipboardItems(event.clipboardData?.items ?? null);
        if (!file) return false;
        event.preventDefault();
        return insertImage(view, file);
      },
      handleDrop(view, event) {
        const file = getImageFile(event.dataTransfer ?? null);
        if (!file) return false;
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (!coords) return false;
        event.preventDefault();
        return insertImage(view, file, coords.pos);
      },
    },
  });
});
