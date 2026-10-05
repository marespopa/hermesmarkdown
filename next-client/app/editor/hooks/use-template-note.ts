"use client";

import { useCallback, useEffect } from "react";
import { useAtomValue, useStore } from "jotai";
import type { EditorView } from "@codemirror/view";
import { atom_templatesFolder } from "@/app/atoms/template-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { useDialog } from "@/app/hooks/use-dialog";
import { noteDisplayTitle } from "@/app/utils/note-display";
import { isTemplatePath, suggestTemplateName } from "@/app/utils/templates/template-registry";
import { openTemplateFieldMenu } from "../codemirror/template-field-completion";
import { setTemplateNote } from "../codemirror/template-field-pills";

interface UseTemplateNoteOptions {
  viewRef: React.RefObject<EditorView | null>;
  editorView: EditorView | null;
  /** Vault path of the note, or "draft". */
  filePath: string;
  /** Only the active pane answers the palette's template commands. */
  isActivePane: boolean;
  /** Opens the template picker and inserts at the caret (or over the selection). */
  insertTemplate: () => void;
  /** useFileSystem().saveAsTemplate; undefined without a vault. */
  saveAsTemplate?: (text: string, suggestedName: string) => Promise<boolean>;
}

// Templates in the editor:
// - A note in the templates folder is a template note: its fields show as
//   pills, `{{` / `/field` / Add field open the field menu, and "Ask a
//   question…" / "Blank to fill in…" ask for the name in a dialog.
// - Any other note can be saved as a template (`/save-template` and the
//   palette), named after its first heading or title.
// - The palette's "Insert template…" / "Save as template…" reach the active
//   pane through `hermes:insert-vault-template` / `hermes:save-as-template`.
export function useTemplateNote({
  viewRef,
  editorView,
  filePath,
  isActivePane,
  insertTemplate,
  saveAsTemplate,
}: UseTemplateNoteOptions) {
  const store = useStore();
  const templatesFolder = useAtomValue(atom_templatesFolder).folder;
  const isTemplateNote = filePath !== "draft" && isTemplatePath(filePath, templatesFolder);
  const dialog = useDialog();

  useEffect(() => {
    editorView?.dispatch({ effects: setTemplateNote.of(isTemplateNote) });
  }, [editorView, isTemplateNote]);

  const insertTemplateField = useCallback(() => {
    if (viewRef.current) openTemplateFieldMenu(viewRef.current);
  }, [viewRef]);

  const askTemplateQuestion = useCallback(async (kind: "question" | "blank") => {
    const answer = kind === "question"
      ? await dialog.prompt("What should it ask? For example: Owner", "", "Ask a question")
      : await dialog.prompt("Name the blank. For example: Task 1", "", "Blank to fill in");
    return typeof answer === "string" ? answer : null;
  }, [dialog]);

  const saveNoteAsTemplate = useCallback(() => {
    const view = viewRef.current;
    if (!view || !saveAsTemplate) return;
    const text = view.state.doc.toString();
    const meta = filePath === "draft" ? undefined : store.get(atom_fileMetadata)[filePath];
    void saveAsTemplate(text, suggestTemplateName(text, meta ? noteDisplayTitle(meta, false) : ""));
  }, [viewRef, saveAsTemplate, filePath, store]);

  useEffect(() => {
    if (!isActivePane) return;
    const onInsert = () => insertTemplate();
    const onSave = () => { if (!isTemplateNote) saveNoteAsTemplate(); };
    document.addEventListener("hermes:insert-vault-template", onInsert);
    document.addEventListener("hermes:save-as-template", onSave);
    return () => {
      document.removeEventListener("hermes:insert-vault-template", onInsert);
      document.removeEventListener("hermes:save-as-template", onSave);
    };
  }, [isActivePane, isTemplateNote, insertTemplate, saveNoteAsTemplate]);

  return {
    isTemplateNote,
    insertTemplateField,
    askTemplateQuestion,
    saveNoteAsTemplate: saveAsTemplate && !isTemplateNote ? saveNoteAsTemplate : undefined,
  };
}
