import type { Ctx } from "@milkdown/kit/ctx";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { $ctx, $prose } from "@milkdown/kit/utils";

export const onUserInputCtx = $ctx<(() => void) | undefined, "onUserInput">(undefined, "onUserInput");

export function configureUserInputTracking(ctx: Ctx, onUserInput?: () => void) {
  ctx.set(onUserInputCtx.key, onUserInput);
}

// Milkdown's markdownUpdated listener fires for every doc change, including
// the very first parse of defaultValueCtx on mount — which round-trips
// through mdast-util-to-markdown and can normalize syntax (escaping, list
// markers, etc.) even though nobody has touched anything yet. EditorHost
// only wants to write reformatted markdown back once the user has actually
// edited, so this tags the first genuine DOM input event (as opposed to the
// programmatic initial mount or an external content replaceAll) for it to
// gate on.
export const userInputTrackerPlugin = $prose((ctx) => {
  const notify = () => ctx.get(onUserInputCtx.key)?.();
  return new Plugin({
    key: new PluginKey("USER_INPUT_TRACKER"),
    props: {
      handleDOMEvents: {
        beforeinput: () => {
          notify();
          return false;
        },
        paste: () => {
          notify();
          return false;
        },
        cut: () => {
          notify();
          return false;
        },
        drop: () => {
          notify();
          return false;
        },
      },
    },
  });
});
