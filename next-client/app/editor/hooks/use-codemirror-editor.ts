"use client";

import { useEffect, useRef } from "react";
import type { EditorView } from "@codemirror/view";
import { EditorView as CodeMirrorView, lineNumbers as codeMirrorLineNumbers } from "@codemirror/view";
import type { Compartment } from "@codemirror/state";
import { getCM, Vim, vim } from "@replit/codemirror-vim";
import type { SlashMenuCallbacks } from "../codemirror/slash-menu";
import type { WikiLinkTriggerCallback } from "../codemirror/wikilink-trigger";
import { flowMode as flowModeExtension } from "../codemirror/flow-mode";
import { isPreviewMode, previewExtension } from "../codemirror/preview-mode";

interface UseCodeMirrorEditorOptions {
  value: string;
  onChange: (value: string) => void;
  wordWrap: boolean;
  lineNumbers: boolean;
  vimMode: boolean;
  flowMode: boolean;
  /** Read-only Preview reading view (codemirror/preview-mode.ts). */
  previewMode?: boolean;
  /** Double-click in Preview asks to switch back to Edit. */
  onExitPreview?: () => void;
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

// A brief dip in opacity so the reflow on a mode switch reads as a crossfade.
function softCrossfade(element: HTMLElement) {
  if (typeof element.animate !== "function") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  element.animate([{ opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });
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
  vimMode,
  flowMode,
  previewMode = false,
  onExitPreview,
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
  const vimModeCompartmentRef = useRef<Compartment | null>(null);
  const flowModeCompartmentRef = useRef<Compartment | null>(null);
  const previewModeCompartmentRef = useRef<Compartment | null>(null);
  const onExitPreviewRef = useRef(onExitPreview);
  onExitPreviewRef.current = onExitPreview;
  // Where a Preview double-click landed: the caret goes there in Edit.
  const exitCaretRef = useRef<number | null>(null);
  // Vim and flow mode are switched off while previewing.
  const editVimMode = vimMode && !previewMode;
  const editFlowMode = flowMode && !previewMode;

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;
    let handleVimEscape: ((event: KeyboardEvent) => void) | null = null;
    let handlePreviewDoubleClick: ((event: MouseEvent) => void) | null = null;

    (async () => {
      const [{ EditorState, Compartment }, { EditorView: CMView }, extensionsModule] = await Promise.all([
        import("@codemirror/state"),
        import("@codemirror/view"),
        import("../codemirror/extensions"),
      ]);

      if (destroyed) return;

      const buildExtensions = extensionsModule.buildExtensions as (
        opts: any,
      ) => import("@codemirror/state").Extension[];
      const wordWrapCompartment = new Compartment();
      const lineNumbersCompartment = new Compartment();
      const vimModeCompartment = new Compartment();
      const flowModeCompartment = new Compartment();
      const previewModeCompartment = new Compartment();
      wordWrapCompartmentRef.current = wordWrapCompartment;
      lineNumbersCompartmentRef.current = lineNumbersCompartment;
      vimModeCompartmentRef.current = vimModeCompartment;
      flowModeCompartmentRef.current = flowModeCompartment;
      previewModeCompartmentRef.current = previewModeCompartment;

      const state = EditorState.create({
        doc: value,
        extensions: buildExtensions({
          wordWrap,
          wordWrapCompartment,
          lineNumbers,
          lineNumbersCompartment,
          vimMode: editVimMode,
          vimModeCompartment,
          flowMode: editFlowMode,
          flowModeCompartment,
          previewMode,
          previewModeCompartment,
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
        const cm = getCM(view as unknown as EditorView);
        if (!cm) return;
        Vim.handleKey(cm, "<Esc>", "user");
        event.preventDefault();
        event.stopImmediatePropagation();
      };
      view.dom.addEventListener("keydown", handleVimEscape, true);
      // Capture phase: tables and rendered blocks stop their own dblclicks.
      handlePreviewDoubleClick = (event: MouseEvent) => {
        if (!isPreviewMode(view.state) || !onExitPreviewRef.current) return;
        if ((event.target as Element | null)?.closest?.("input, a, .cm-link-display")) return;
        event.preventDefault();
        event.stopPropagation();
        try {
          exitCaretRef.current = view.posAtCoords({ x: event.clientX, y: event.clientY });
        } catch {
          exitCaretRef.current = null; // no layout (e.g. jsdom): fall back to the top line
        }
        onExitPreviewRef.current();
      };
      view.dom.addEventListener("dblclick", handlePreviewDoubleClick, true);
      onViewCreated?.(view as unknown as EditorView);
    })();

    return () => {
      destroyed = true;
      const v = viewRef.current as unknown as { destroy?: () => void } | null;
      if (v && typeof v.destroy === "function") {
        if (handleVimEscape) {
          (v as unknown as EditorView).dom.removeEventListener("keydown", handleVimEscape, true);
        }
        if (handlePreviewDoubleClick) {
          (v as unknown as EditorView).dom.removeEventListener("dblclick", handlePreviewDoubleClick, true);
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
      effects: compartment.reconfigure(lineNumbers ? codeMirrorLineNumbers() : []),
    });
  }, [lineNumbers, viewRef]);

  useEffect(() => {
    const view = viewRef.current;
    const compartment = vimModeCompartmentRef.current;
    if (!view || !compartment) return;
    view.dispatch({ effects: compartment.reconfigure(editVimMode ? vim({ status: true }) : []) });
  }, [editVimMode, viewRef]);

  useEffect(() => {
    const view = viewRef.current;
    const compartment = flowModeCompartmentRef.current;
    if (!view || !compartment) return;
    view.dispatch({ effects: compartment.reconfigure(editFlowMode ? flowModeExtension() : []) });
  }, [editFlowMode, viewRef]);

  // Switching mode keeps the paragraph at the top of the viewport in place.
  // Leaving preview puts the caret where it was double-clicked, or else on
  // that top line, so typing resumes in place (the caller focuses the active
  // pane's view).
  useEffect(() => {
    const view = viewRef.current;
    const compartment = previewModeCompartmentRef.current;
    if (!view || !compartment || isPreviewMode(view.state) === previewMode) return;
    const firstVisible = view.visibleRanges[0]?.from ?? view.viewport.from;
    const anchor = view.state.doc.lineAt(firstVisible).from;
    const caret = exitCaretRef.current ?? anchor;
    exitCaretRef.current = null;
    view.dispatch({
      effects: [
        compartment.reconfigure(previewExtension(previewMode)),
        CodeMirrorView.scrollIntoView(anchor, { y: "start" }),
      ],
      ...(previewMode ? {} : { selection: { anchor: Math.min(caret, view.state.doc.length) } }),
    });
    softCrossfade(view.scrollDOM);
  }, [previewMode, viewRef]);

  // Keep the view in sync when `value` changes for a reason other than
  // the user typing in it (e.g. external file reload, undo outside CM6).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
      userEvent: "input.external",
    });
  }, [value, viewRef]);

  return { containerRef, viewRef };
}
