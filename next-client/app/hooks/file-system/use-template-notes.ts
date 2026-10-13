"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import { atom_vaultHandle, resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { useTemplateDialog } from "../use-template-dialog";
import type { TemplateEntry } from "@/app/utils/templates/template-registry";
import { templateContent } from "@/app/utils/templates/template-frontmatter";
import {
  expandTemplate,
  extractPromptLabels,
  usesToken,
  type ExpandedTemplate,
  type TemplateContext,
} from "@/app/utils/templates/template-tokens";

export interface InstantiatedTemplate {
  expanded: ExpandedTemplate;
}

async function readClipboard(): Promise<string> {
  try {
    return (await navigator.clipboard?.readText()) ?? "";
  } catch {
    // Denied or unavailable: the token becomes empty.
    return "";
  }
}

// Reads templates from disk and turns them into note text: asks for
// `{{prompt:…}}` values, reads the clipboard only when `{{clipboard}}` is
// used, and expands every token in one pass.
export function useTemplateNotes() {
  const store = useStore();
  const { askPrompts } = useTemplateDialog();

  // Always the saved file on disk (fresh handle), so edits apply on next use
  // even before a rescan, and unsaved tab text never leaks in.
  const readTemplate = useCallback(async (entry: TemplateEntry): Promise<string> => {
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) throw new Error("No vault open");
    const handle = await resolveFileHandleAtPath(vaultHandle, entry.path);
    return (await handle.getFile()).text();
  }, [store]);

  // null = the prompts form was cancelled. `selection` fills `{{selection}}`
  // (inserting over selected text); new notes have none.
  const instantiate = useCallback(async (
    raw: string,
    title: string,
    confirmLabel: string,
    selection = "",
  ): Promise<InstantiatedTemplate | null> => {
    const content = templateContent(raw);
    const labels = extractPromptLabels(content);
    let prompts: Record<string, string> = {};
    if (labels.length > 0) {
      const answers = await askPrompts(labels, confirmLabel);
      if (!answers) return null;
      prompts = answers;
    }
    const clipboard = usesToken(content, "clipboard") ? await readClipboard() : "";
    const context: TemplateContext = { now: new Date(), title, clipboard, prompts, selection };
    return { expanded: expandTemplate(content, context) };
  }, [askPrompts]);

  return { readTemplate, instantiate };
}
