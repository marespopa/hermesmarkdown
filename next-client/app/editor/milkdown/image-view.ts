import type { Node as ProseNode } from "@milkdown/kit/prose/model";
import type { EditorView, NodeView } from "@milkdown/kit/prose/view";
import type { Ctx } from "@milkdown/kit/ctx";
import { $ctx, $view } from "@milkdown/kit/utils";
import { imageSchema } from "@milkdown/kit/preset/commonmark";

// Resolves a node's `src` attr (a vault-relative path for local images, or
// left as-is for http(s)/data/blob URLs) into something an <img> can
// actually load — wired from EditablePreview.tsx via
// paste-image.ts's resolveVaultImageSrc, same ctx-slot pattern as
// onPasteImageCtx in image-paste.ts.
export const onResolveImageSrcCtx = $ctx<((src: string) => Promise<string | null>) | undefined, "onResolveImageSrc">(
  undefined,
  "onResolveImageSrc",
);

export function configureResolveImageSrc(ctx: Ctx, resolver?: (src: string) => Promise<string | null>) {
  ctx.set(onResolveImageSrcCtx.key, resolver);
}

const REGEX_ABSOLUTE_SRC = /^(https?:|data:|blob:)/i;

// Default rendering of an image node is just a bare <img src>, which:
// (1) can't display a vault-relative path with no server behind it, and
// (2) offers no way to remove the image short of selecting the atom node
// (fiddly, especially on mobile) and pressing Backspace. This NodeView
// fixes both: resolves the src through the ctx callback above, and adds an
// always-visible remove button (no hover-only affordance — touch has no
// hover) that deletes the node directly.
class ImageView implements NodeView {
  dom: HTMLElement;
  private img: HTMLImageElement;
  private node: ProseNode;

  constructor(
    node: ProseNode,
    private view: EditorView,
    private getPos: () => number | undefined,
    private ctx: Ctx,
  ) {
    this.node = node;

    const wrapper = document.createElement("span");
    wrapper.contentEditable = "false";
    // Block display (not inline-block) even though the node stays inline
    // in the ProseMirror doc model — any text sharing the paragraph before
    // or after the image should land on its own row rather than wrapping
    // around it mid-line.
    wrapper.className = "image-view not-prose relative block w-fit max-w-full my-4";
    this.dom = wrapper;

    const img = document.createElement("img");
    img.alt = node.attrs.alt || "";
    if (node.attrs.title) img.title = node.attrs.title;
    img.className = "max-w-full rounded-md m-0";
    wrapper.appendChild(img);
    this.img = img;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.setAttribute("aria-label", "Remove image");
    removeBtn.title = "Remove image";
    removeBtn.textContent = "×";
    removeBtn.className =
      "image-view-remove absolute top-1 right-1 flex items-center justify-center w-5 h-5 rounded-full bg-black/60 text-white text-xs leading-none hover:bg-red-600 transition-colors";
    removeBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.removeSelf();
    });
    wrapper.appendChild(removeBtn);

    this.resolveSrc(node.attrs.src);
  }

  private removeSelf() {
    const pos = this.getPos();
    if (pos == null) return;
    const tr = this.view.state.tr.delete(pos, pos + this.node.nodeSize);
    this.view.dispatch(tr);
  }

  private resolveSrc(src: string) {
    if (!src) return;
    if (REGEX_ABSOLUTE_SRC.test(src)) {
      this.img.src = src;
      return;
    }
    const resolver = this.ctx.get(onResolveImageSrcCtx.key);
    if (!resolver) {
      this.img.src = src;
      return;
    }
    this.img.classList.add("opacity-40");
    resolver(src)
      .then((resolved) => {
        if (resolved) {
          this.img.src = resolved;
          this.img.classList.remove("opacity-40");
        } else {
          this.img.removeAttribute("src");
          this.img.alt = `${this.node.attrs.alt || src} (image not found)`;
        }
      })
      .catch(() => {
        this.img.removeAttribute("src");
      });
  }

  update(node: ProseNode): boolean {
    if (node.type !== this.node.type) return false;
    const prevNode = this.node;
    const srcChanged = node.attrs.src !== prevNode.attrs.src;
    this.node = node;
    if (node.attrs.alt !== prevNode.attrs.alt) this.img.alt = node.attrs.alt || "";
    if (node.attrs.title !== prevNode.attrs.title) {
      if (node.attrs.title) this.img.title = node.attrs.title;
      else this.img.removeAttribute("title");
    }
    if (srcChanged) this.resolveSrc(node.attrs.src);
    return true;
  }

  ignoreMutation(): boolean {
    return true;
  }
}

export const imageView = $view(
  imageSchema.node,
  (ctx) => (node, view, getPos) => new ImageView(node, view, getPos, ctx),
);
