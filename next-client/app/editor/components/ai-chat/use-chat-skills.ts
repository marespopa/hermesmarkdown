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
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { isTemplatePath } from "@/app/utils/templates/template-registry";
import type { ChatMessage } from "./chat-helpers";
import { CHAT_SKILLS, isSkillActive, type ChatSkill, type TemplateBlock } from "./chat-skills";
import { openTasksBlock } from "./skill-context";
import { isUserSkillActive, readUserSkill, userSkillsFrom } from "./user-skills";

// AI Chat side of the chat skills: which skill text a turn sends (each active
// built-in skill's instructions, plus the open tasks the tasks skill works
// from, and the user's own skill notes turned on by their /command, read
// fresh each turn), and saving a reply's template block into
// the templates folder (only from the user's explicit Save / Replace click).
export function useChatSkills() {
  const store = useStore();
  const templates = useAtomValue(atom_templates);
  const { folder } = useAtomValue(atom_templatesFolder);
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const { scanVault, indexVaultTags } = useFileSystem();

  // The data a skill works from, or "" for one that has none (templates).
  const skillContext = useCallback(async (skill: ChatSkill): Promise<string> => {
    if (skill.id === "tasks") {
      const templatesFolder = store.get(atom_templatesFolder).folder;
      const skip = (path: string) => path.startsWith(".hermesmarkdown/") || isTemplatePath(path, templatesFolder);
      return openTasksBlock(store.get(atom_fileMetadata), new Date(), skip);
    }
    return "";
  }, [store]);

  // Skill text for the next request, given the thread including the new user message.
  const skillInstructionsFor = useCallback(async (messages: ChatMessage[]): Promise<string[]> => {
    const userTexts = messages.filter((m) => m.role === "user").map((m) => m.displayContent);
    const active = CHAT_SKILLS.filter((skill) => isSkillActive(skill, userTexts));
    const builtIn = Promise.all(active.map(async (skill) => {
      const context = await skillContext(skill);
      return context ? `${skill.builtin}\n\n${context}` : skill.builtin;
    }));
    // The user's own skill notes turned on by their /command (user-skills.ts).
    const vault = store.get(atom_vaultHandle);
    const own = vault
      ? userSkillsFrom(store.get(atom_fileMetadata), CHAT_SKILLS.map((skill) => skill.command))
        .filter((skill) => isUserSkillActive(skill, userTexts))
      : [];
    const ownTexts = Promise.all(own.map((skill) => readUserSkill(vault!, skill.path)));
    const [fromApp, fromVault] = await Promise.all([builtIn, ownTexts]);
    return [...fromApp, ...fromVault.filter((text): text is string => !!text)];
  }, [store, skillContext]);

  const templateExists = useCallback(
    (fileName: string) => {
      const target = `${folder}/${fileName}`.toLowerCase();
      return templates.some((template) => template.path.toLowerCase() === target);
    },
    [folder, templates],
  );

  // Writes `templates/<fileName>` (creating `templates/` when no
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
