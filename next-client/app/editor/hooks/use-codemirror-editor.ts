"use client";

import { useEffect, useRef } from "react";
import type { EditorView } from "@codemirror/view";
import type { EditorState } from "@codemirror/state";
import type { SlashMenuCallbacks } from "../codemirror/slash-menu";
import type { WikiLinkTriggerCallback } from "../codemirror/wikilink-trigger";

interface UseCodeMirrorEditorOptions {
  value: string;
  onChange: (value: string) => void;
  wordWrap: boolean;
  placeholder?: string;
  readOnly: boolean;
  onFocusChange: (focused: boolean) => void;
  onCursorActivity?: (view: EditorView) => void;
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
  placeholder,
  readOnly,
  onFocusChange,
  onCursorActivity,
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

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;

    (async () => {
      const [{ EditorState }, { EditorView: CMView }, extensionsModule] = await Promise.all([
        import("@codemirror/state"),
        import("@codemirror/view"),
        import("../codemirror/extensions"),
      ]);

      if (destroyed) return;

      const buildExtensions = extensionsModule.buildExtensions as (
        opts: any,
      ) => import("@codemirror/state").Extension[];

      const state = EditorState.create({
        doc: value,
        extensions: buildExtensions({
          wordWrap,
          placeholder,
          readOnly,
          onFocusChange,
          onCursorActivity: (view: any) => onCursorActivityRef.current?.(view),
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
      onViewCreated?.(view as unknown as EditorView);
    })();

    return () => {
      destroyed = true;
      const v = viewRef.current as unknown as { destroy?: () => void } | null;
      if (v && typeof v.destroy === "function") {
        v.destroy();
        viewRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  }, [value]);

  return { containerRef, viewRef };
}
