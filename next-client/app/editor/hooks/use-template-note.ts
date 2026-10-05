"use client";

import { useCallback, useEffect } from "react";
import { useAtomValue } from "jotai";
import type { EditorView } from "@codemirror/view";
import { atom_templatesFolder } from "@/app/atoms/template-atoms";
import { useDialog } from "@/app/hooks/use-dialog";
import { isTemplatePath } from "@/app/utils/templates/template-registry";
import { openTemplateFieldMenu } from "../codemirror/template-field-completion";
import { setTemplateNote } from "../codemirror/template-field-pills";

interface UseTemplateNoteOptions {
  viewRef: React.RefObject<EditorView | null>;
  editorView: EditorView | null;
  /** Vault path of the note, or "draft". */
  filePath: string;
}

// A note in the templates folder is a template note: its fields show as
// pills, `{{` / `/field` / Add field open the field menu, and "Ask a
// question…" asks for the question in a dialog.
export function useTemplateNote({ viewRef, editorView, filePath }: UseTemplateNoteOptions) {
  const templatesFolder = useAtomValue(atom_templatesFolder).folder;
  const isTemplateNote = filePath !== "draft" && isTemplatePath(filePath, templatesFolder);
  const dialog = useDialog();

  useEffect(() => {
    editorView?.dispatch({ effects: setTemplateNote.of(isTemplateNote) });
  }, [editorView, isTemplateNote]);

  const insertTemplateField = useCallback(() => {
    if (viewRef.current) openTemplateFieldMenu(viewRef.current);
  }, [viewRef]);

  const askTemplateQuestion = useCallback(async () => {
    const answer = await dialog.prompt("What should it ask? For example: Owner", "", "Ask a question");
    return typeof answer === "string" ? answer : null;
  }, [dialog]);

  return { isTemplateNote, insertTemplateField, askTemplateQuestion };
}
