import type { Ctx } from "@milkdown/kit/ctx";
import type { EditorView } from "@milkdown/kit/prose/view";
import { Plugin } from "@milkdown/kit/prose/state";
import { $ctx, $prose } from "@milkdown/kit/utils";

type OnViewReadyHandler = (view: EditorView | null) => void;

export const onMilkdownViewReadyCtx = $ctx<OnViewReadyHandler | undefined, "onMilkdownViewReady">(
  undefined,
  "onMilkdownViewReady",
);

export function configureMilkdownViewReady(ctx: Ctx, onReady?: OnViewReadyHandler) {
  ctx.set(onMilkdownViewReadyCtx.key, onReady);
}

// Hands the live ProseMirror EditorView to the caller the moment it mounts
// (and reports it gone on destroy) — Milkdown's ctx system otherwise only
// exposes the view from inside plugin/action callbacks, but
// use-global-voice-input.ts needs a handle on it from plain React state
// (atom_activeMilkdownView) to dictate into Rendered mode at the real
// cursor, the same way atom_activeEditorView does for CM6/Source.
export const activeViewPlugin = $prose((ctx) => {
  return new Plugin({
    view: (view: EditorView) => {
      // Captured once here, not re-read from `ctx` inside `destroy` below —
      // by teardown time Milkdown has already torn down this editor's ctx
      // container, so a fresh `ctx.get(...)` throws "Context ... not found"
      // instead of just returning undefined.
      const onReady = ctx.get(onMilkdownViewReadyCtx.key);
      onReady?.(view);
      return {
        destroy: () => {
          onReady?.(null);
        },
      };
    },
  });
});
