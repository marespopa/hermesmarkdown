"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import type { EditorView } from "@codemirror/view";
import toast from "react-hot-toast";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { useTemplateDialog } from "@/app/hooks/use-template-dialog";
import { useTemplateNotes } from "@/app/hooks/file-system/use-template-notes";
import { noteDisplayTitle } from "@/app/utils/note-display";
import { templateBody } from "@/app/utils/templates/template-frontmatter";
import type { ExpandedTemplate } from "@/app/utils/templates/template-tokens";
import { insertExpandedTemplate } from "../codemirror/slash-menu";

interface UseVaultTemplateInsertOptions {
  viewRef: React.RefObject<EditorView | null>;
  /** Vault path of the note, or "draft". */
  filePath: string;
}

// The template's body only (no frontmatter block), with the caret offset
// moved along; a caret that was inside the frontmatter goes to the end.
function bodyOnly({ text, cursor }: ExpandedTemplate): ExpandedTemplate {
  const body = templateBody(text);
  const removed = text.length - body.length;
  return { text: body, cursor: cursor !== null && cursor >= removed ? cursor - removed : null };
}

// `/template` in the slash menu: pick a vault template, answer its prompts,
// then insert it at the caret. An empty note gets the whole template
// (non-routing frontmatter included); otherwise only the body.
export function useVaultTemplateInsert({ viewRef, filePath }: UseVaultTemplateInsertOptions) {
  const store = useStore();
  const { pickTemplate } = useTemplateDialog();
  const { readTemplate, instantiate } = useTemplateNotes();

  return useCallback(async () => {
    const chosen = await pickTemplate({ includeBlank: false, title: "Insert template" });
    if (!chosen || chosen === "blank") return;
    let raw: string;
    try {
      raw = await readTemplate(chosen);
    } catch (err: any) {
      console.warn("Failed to read template:", err?.message || err);
      toast.error(`Couldn't read template ${chosen.name}`);
      return;
    }
    const meta = filePath === "draft" ? undefined : store.get(atom_fileMetadata)[filePath];
    const title = meta ? noteDisplayTitle(meta, false) : "";
    const result = await instantiate(raw, title, "Insert");
    if (!result) return;
    // The tab may have been switched or closed while the dialogs were open.
    const view = viewRef.current;
    if (!view || !view.dom.isConnected) return;
    const isBlank = view.state.doc.toString().trim() === "";
    const { text, cursor } = isBlank ? result.expanded : bodyOnly(result.expanded);
    insertExpandedTemplate(view, text, cursor);
  }, [pickTemplate, readTemplate, instantiate, filePath, store, viewRef]);
}
