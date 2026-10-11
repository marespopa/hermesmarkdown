"use client";

import { useEffect, useRef } from "react";
import type { EditorView } from "@codemirror/view";
import { EditorView as CodeMirrorView } from "@codemirror/view";
import type { Compartment } from "@codemirror/state";
import { loadedVim, loadVim } from "../codemirror/vim-loader";
import type { SlashMenuCallbacks } from "../codemirror/slash-menu";
import type { WikiLinkTriggerCallback } from "../codemirror/wikilink-trigger";
import { flowMode as flowModeExtension } from "../codemirror/flow-mode";
import { invisibles } from "../codemirror/invisibles";
import { editorLineNumbers } from "../codemirror/line-numbers";
import { changedRange } from "@/app/utils/text-diff";

interface UseCodeMirrorEditorOptions {
  value: string;
  onChange: (value: string) => void;
  wordWrap: boolean;
  lineNumbers: boolean;
  showInvisibles: boolean;
  vimMode: boolean;
  flowMode: boolean;
  onOpenActiveHelperRef: { current: () => boolean };
  placeholder?: string;
  readOnly: boolean;
  onFocusChange: (focused: boolean) => void;
  onCursorActivity?: (view: EditorView) => void;
  onViewportChange?: (view: EditorView) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewRef: React.RefObject<EditorView | null>;
  slashMenuCallbacksRef: { current: SlashMenuCallbacks };
  wikiLinkTriggerRef: { current: WikiLinkTriggerCallback | null };
  csvConfirmRef?: { current: ((preview: string) => Promise<boolean>) | null };
  pasteImageRef?: { current: ((file: File) => Promise<string | null>) | null };
  onViewCreated?: (view: EditorView) => void;
}

// Owns the CodeMirror 6 EditorView lifecycle: mounts it into containerRef,
// keeps it in sync with the external value/onChange contract (mirroring
// what react-simple-code-editor did for the old textarea-based engine),
// and exposes the live `view` for feature layers (commands, widgets) to
// dispatch transactions against. containerRef/viewRef are created by the
// caller (not here) so sibling hooks — e.g. use-codemirror-features, which
// needs onCursorActivity wired into extensions before this view exists —
// can share the same ref identities without a circular dependency.
export function useCodeMirrorEditor({
  value,
  onChange,
  wordWrap,
  lineNumbers,
  showInvisibles,
  vimMode,
  flowMode,
  onOpenActiveHelperRef,
  placeholder,
  readOnly,
  onFocusChange,
  onCursorActivity,
  onViewportChange,
  containerRef,
  viewRef,
  slashMenuCallbacksRef,
  wikiLinkTriggerRef,
  csvConfirmRef,
  pasteImageRef,
  onViewCreated,
}: UseCodeMirrorEditorOptions) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCursorActivityRef = useRef(onCursorActivity);
  onCursorActivityRef.current = onCursorActivity;
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;
  const wordWrapCompartmentRef = useRef<Compartment | null>(null);
  const lineNumbersCompartmentRef = useRef<Compartment | null>(null);
  const invisiblesCompartmentRef = useRef<Compartment | null>(null);
  const vimModeCompartmentRef = useRef<Compartment | null>(null);
  const flowModeCompartmentRef = useRef<Compartment | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;
    let handleVimEscape: ((event: KeyboardEvent) => void) | null = null;

    (async () => {
      const [{ EditorState, Compartment }, { EditorView: CMView }, extensionsModule] = await Promise.all([
        import("@codemirror/state"),
        import("@codemirror/view"),
        import("../codemirror/extensions"),
        // Vim is loaded only when it's on (see vim-loader.ts).
        vimMode ? loadVim() : null,
      ]);

      if (destroyed) return;

      const buildExtensions = extensionsModule.buildExtensions as (
        opts: any,
      ) => import("@codemirror/state").Extension[];
      const wordWrapCompartment = new Compartment();
      const lineNumbersCompartment = new Compartment();
      const invisiblesCompartment = new Compartment();
      const vimModeCompartment = new Compartment();
      const flowModeCompartment = new Compartment();
      wordWrapCompartmentRef.current = wordWrapCompartment;
      lineNumbersCompartmentRef.current = lineNumbersCompartment;
      invisiblesCompartmentRef.current = invisiblesCompartment;
      vimModeCompartmentRef.current = vimModeCompartment;
      flowModeCompartmentRef.current = flowModeCompartment;

      const state = EditorState.create({
        doc: value,
        extensions: buildExtensions({
          wordWrap,
          wordWrapCompartment,
          lineNumbers,
          lineNumbersCompartment,
          showInvisibles,
          invisiblesCompartment,
          vimMode,
          vimModeCompartment,
          flowMode,
          flowModeCompartment,
          onOpenActiveHelperRef,
          placeholder,
          readOnly,
          onFocusChange,
          onCursorActivity: (view: any) => onCursorActivityRef.current?.(view),
          onViewportChange: (view: any) => onViewportChangeRef.current?.(view),
          slashMenuCallbacksRef,
          wikiLinkTriggerRef,
          csvConfirmRef,
          pasteImageRef,
        }),
      });

      const view = new CMView({
        state,
        parent: containerRef.current as HTMLElement,
        dispatchTransactions: (trs: any) => {
          view.update(trs);
          if (trs.some((tr: any) => tr.docChanged)) {
            onChangeRef.current(view.state.doc.toString());
          }
        },
      });

      viewRef.current = view as unknown as EditorView;
      handleVimEscape = (event: KeyboardEvent) => {
        if (event.key !== "Escape") return;
        const vimModule = loadedVim();
        const cm = vimModule?.getCM(view as unknown as EditorView);
        if (!vimModule || !cm) return;
        vimModule.Vim.handleKey(cm, "<Esc>", "user");
        event.preventDefault();
        event.stopImmediatePropagation();
      };
      view.dom.addEventListener("keydown", handleVimEscape, true);
      onViewCreated?.(view as unknown as EditorView);
    })();

    return () => {
      destroyed = true;
      const v = viewRef.current as unknown as { destroy?: () => void } | null;
      if (v && typeof v.destroy === "function") {
        if (handleVimEscape) {
          (v as unknown as EditorView).dom.removeEventListener("keydown", handleVimEscape, true);
        }
        v.destroy();
        viewRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewRef]);

  useEffect(() => {
    const view = viewRef.current;
    const compartment = wordWrapCompartmentRef.current;
    if (!view || !compartment) return;
    view.dispatch({
      effects: compartment.reconfigure(wordWrap ? CodeMirrorView.lineWrapping : []),
    });
  }, [wordWrap, viewRef]);

  useEffect(() => {
    const view = viewRef.current;
    const compartment = lineNumbersCompartmentRef.current;
    if (!view || !compartment) return;
    view.dispatch({
      effects: compartment.reconfigure(lineNumbers ? editorLineNumbers() : []),
    });
  }, [lineNumbers, viewRef]);

  useEffect(() => {
    const view = viewRef.current;
    const compartment = invisiblesCompartmentRef.current;
    if (!view || !compartment) return;
    view.dispatch({ effects: compartment.reconfigure(showInvisibles ? invisibles() : []) });
  }, [showInvisibles, viewRef]);

  useEffect(() => {
    const view = viewRef.current;
    const compartment = vimModeCompartmentRef.current;
    if (!view || !compartment) return;
    if (!vimMode) {
      view.dispatch({ effects: compartment.reconfigure([]) });
      return;
    }
    let cancelled = false;
    void loadVim().then((vimModule) => {
      if (!cancelled) view.dispatch({ effects: compartment.reconfigure(vimModule.vim()) });
    });
    return () => {
      cancelled = true;
    };
  }, [vimMode, viewRef]);

  useEffect(() => {
    const view = viewRef.current;
    const compartment = flowModeCompartmentRef.current;
    if (!view || !compartment) return;
    view.dispatch({ effects: compartment.reconfigure(flowMode ? flowModeExtension() : []) });
  }, [flowMode, viewRef]);

  // Keep the view in sync when `value` changes for a reason other than
  // the user typing in it (e.g. external file reload, undo outside CM6,
  // a quick jot appended to this note). Only the changed range is replaced,
  // so the selection maps through it and the scroll doesn't jump.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const change = changedRange(view.state.doc.toString(), value);
    if (!change) return;
    view.dispatch({
      changes: change,
      userEvent: "input.external",
    });
  }, [value, viewRef]);

  return { containerRef, viewRef };
}
