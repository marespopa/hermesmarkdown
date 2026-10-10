"use client";

import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tableToolExtensions } from "./table-tool-extensions";

export interface ReplaceRequest {
  doc: string;
  // A new id applies the doc again, even if it's the same text.
  id: number;
}

interface Props {
  // The starting document; later changes come through `replaceRequest`.
  value: string;
  onChange: (doc: string) => void;
  replaceRequest: ReplaceRequest | null;
}

// A CodeMirror view holding only the table grid. It owns its document after
// mount: typing reports through `onChange`, and a `replaceRequest` (New
// table, CSV import) replaces the whole document as one undoable change.
export default function TableGridEditor({ value, onChange, replaceRequest }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: value,
        extensions: tableToolExtensions((doc) => onChangeRef.current(doc)),
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // The view is created once; `value` is only its starting document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !replaceRequest) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: replaceRequest.doc } });
  }, [replaceRequest]);

  return (
    <div
      ref={hostRef}
      className="editor-sheet editor-container px-4 py-5 sm:px-6 text-ui-body"
      aria-label="Table editor"
    />
  );
}
