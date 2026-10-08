import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { EditorView } from "@codemirror/view";
import { loadedVim, loadVim } from "../codemirror/vim-loader";

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
// Vim loads on demand (vim-loader.ts). Call this after `useCodeMirrorEditor`:
// both wait on the same load, and the editor's wait is registered first, so
// by the time `vimModule` is set here the Vim compartment has been
// reconfigured and `getCM(view)` is the live instance.
export function useVimStatus(view: EditorView | null, enabled: boolean) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [vimModule, setVimModule] = useState(loadedVim);

  useEffect(() => {
    if (!enabled || vimModule) return;
    let cancelled = false;
    void loadVim().then((module) => {
      if (!cancelled) setVimModule(module);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, vimModule]);

  const subscribe = useCallback((onChange: () => void) => {
    const cm = view && enabled ? vimModule?.getCM(view) : null;
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
  }, [view, enabled, vimModule]);

  const snapshot = useSyncExternalStore(
    subscribe,
    () => {
      const cm = view && enabled ? vimModule?.getCM(view) : null;
      if (!cm) return IDLE;
      return `${cm.state.vim?.mode ?? "normal"}|${cm.state.dialog ? 1 : 0}`;
    },
    () => IDLE,
  );

  const [mode, prompting] = snapshot.split("|");
  const status: VimStatus = { mode, prompting: prompting === "1" };
  return { hostRef, status };
}
