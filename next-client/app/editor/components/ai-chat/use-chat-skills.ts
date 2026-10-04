"use client";

import { useCallback } from "react";
import { useAtomValue, useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_templates, atom_templatesFolder } from "@/app/atoms/template-atoms";
import { withRetry } from "@/app/hooks/file-system/shared";
import { ensureVaultFolder } from "@/app/hooks/file-system/unique-file";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { writeFileContent } from "@/app/services/file-writer";
import type { ChatMessage } from "./chat-helpers";
import { isSkillActive, loadSkillInstructions, TEMPLATE_SKILL, type TemplateBlock } from "./chat-skills";

// AI Chat side of the template skill: which skill text a turn sends, and
// saving a reply's template block into the templates folder (only from the
// user's explicit Save / Replace click).
export function useChatSkills() {
  const store = useStore();
  const templates = useAtomValue(atom_templates);
  const { folder } = useAtomValue(atom_templatesFolder);
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const { scanVault, indexVaultTags } = useFileSystem();

  // Skill instructions for the next request, given the thread including the new user message.
  const skillInstructionsFor = useCallback(async (messages: ChatMessage[]): Promise<string[]> => {
    const userTexts = messages.filter((m) => m.role === "user").map((m) => m.displayContent);
    if (!isSkillActive(TEMPLATE_SKILL, userTexts)) return [];
    return [await loadSkillInstructions(TEMPLATE_SKILL, store.get(atom_vaultHandle))];
  }, [store]);

  const templateExists = useCallback(
    (fileName: string) => {
      const target = `${folder}/${fileName}`.toLowerCase();
      return templates.some((template) => template.path.toLowerCase() === target);
    },
    [folder, templates],
  );

  // Writes `<templates folder>/<fileName>` (creating `templates/` when no
  // folder exists yet), overwriting an existing template. True on success.
  const saveTemplate = useCallback(async (block: TemplateBlock): Promise<boolean> => {
    const vault = store.get(atom_vaultHandle);
    if (!vault) return false;
    const templatesFolder = store.get(atom_templatesFolder).folder;
    try {
      const dir = await ensureVaultFolder(vault, templatesFolder);
      const handle = await withRetry(() => dir.getFileHandle(block.fileName, { create: true }));
      await withRetry(() => writeFileContent(handle, block.content || "\n"));
      await scanVault(vault);
      await indexVaultTags();
      toast.success(`Saved template: ${templatesFolder}/${block.fileName}`);
      return true;
    } catch (err: any) {
      console.warn("Failed to save template:", err?.message || err);
      toast.error("Failed to save template");
      return false;
    }
  }, [store, scanVault, indexVaultTags]);

  return { skillInstructionsFor, saveTemplate, templateExists, templatesFolder: folder, hasVault: !!vaultHandle };
}
