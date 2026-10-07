import { useCallback, useRef, useSyncExternalStore } from "react";
import type { EditorView } from "@codemirror/view";
import { getCM } from "@replit/codemirror-vim";

export type VimStatus = {
  /** "normal", "insert", "visual", "visual line", "visual block", "replace". */
  mode: string;
  /** A `:` / `/` prompt or a Vim message is open in the status host. */
  prompting: boolean;
};

const IDLE = "normal|0";

// Feeds `VimStatusPill`. The library is created with `vim()` (no status
// panel); pointing `cm.state.statusbar` at our own element makes it render
// the `:` / `/` prompt, Vim messages and pending keys (`d2`) there instead
// of opening a CodeMirror panel under the text.
//
// Call it after `useCodeMirrorEditor`: effects run in declaration order, so
// by the time this subscribes, the Vim compartment has been reconfigured
// and `getCM(view)` is the live instance.
export function useVimStatus(view: EditorView | null, enabled: boolean) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  const subscribe = useCallback((onChange: () => void) => {
    const cm = view && enabled ? getCM(view) : null;
    const host = hostRef.current;
    if (!cm || !host) return () => {};
    cm.state.statusbar = host;
    cm.state.vimPlugin?.updateStatus();
    const events = ["vim-mode-change", "dialog"];
    events.forEach((event) => cm.on(event, onChange));
    onChange();
    return () => {
      events.forEach((event) => cm.off(event, onChange));
      if (cm.state.statusbar === host) cm.state.statusbar = null;
    };
  }, [view, enabled]);

  const snapshot = useSyncExternalStore(
    subscribe,
    () => {
      const cm = view && enabled ? getCM(view) : null;
      if (!cm) return IDLE;
      return `${cm.state.vim?.mode ?? "normal"}|${cm.state.dialog ? 1 : 0}`;
    },
    () => IDLE,
  );

  const [mode, prompting] = snapshot.split("|");
  const status: VimStatus = { mode, prompting: prompting === "1" };
  return { hostRef, status };
}
