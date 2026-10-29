"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_templatesFolder } from "@/app/atoms/template-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { isTemplatePath } from "@/app/utils/templates/template-registry";
import { CHAT_SKILLS, skillCommand, startsWithCommand, type ChatSkill } from "./chat-skills";
import { openTasksBlock } from "./skill-context";
import { readUserSkill, userSkillsFrom } from "./user-skills";
import { COMPANION_COMMANDS } from "../companion/companion-commands";
import type { CompanionToolName } from "@/app/services/companion-tool-defs";
import type { ProjectCheckId } from "@/app/services/project-checks";

// A skill in the companion's system prompt list: its command and when to load it.
export interface SkillListing {
  command: string;
  description?: string;
  toolBindings?: CompanionToolName[];
  projectChecks?: ProjectCheckId[];
}

// The AI companion's skills: the list its system prompt names (built-in
// skills, then the user's skill notes), and a skill's text when the model
// loads it (load_skill) or a message starts with its /command: the built-in
// skill's instructions plus the data it works from (the open tasks for the
// tasks skill), or the skill note read fresh from disk.
export function useChatSkills() {
  const store = useStore();

  // The data a skill works from, or "" for one that has none (templates).
  const skillContext = useCallback(async (skill: ChatSkill): Promise<string> => {
    if (skill.id === "tasks") {
      const templatesFolder = store.get(atom_templatesFolder).folder;
      const skip = (path: string) => path.startsWith(".hermesmarkdown/") || isTemplatePath(path, templatesFolder);
      return openTasksBlock(store.get(atom_fileMetadata), new Date(), skip);
    }
    return "";
  }, [store]);

  // The user's skill notes (none without a vault); built-in skills and the
  // companion's own commands (/new, /compact…) win.
  const userSkills = useCallback(() => (store.get(atom_vaultHandle)
    ? userSkillsFrom(store.get(atom_fileMetadata), [...CHAT_SKILLS.map((skill) => skill.command), ...COMPANION_COMMANDS])
    : []), [store]);

  const skillList = useCallback((): SkillListing[] => [
    ...CHAT_SKILLS.map(({ command, description }) => ({ command, description })),
    ...userSkills().map(({ command, description, toolBindings, projectChecks }) => ({ command, description, toolBindings, projectChecks })),
  ], [userSkills]);

  // A skill's text by name or command ("tasks", "/tasks"); null when there's
  // no such skill or its note is gone or empty.
  const loadSkill = useCallback(async (name: string): Promise<string | null> => {
    const command = skillCommand(name);
    if (!command) return null;
    const builtIn = CHAT_SKILLS.find((skill) => skill.command === command);
    if (builtIn) {
      const context = await skillContext(builtIn);
      return context ? `${builtIn.builtin}\n\n${context}` : builtIn.builtin;
    }
    const own = userSkills().find((skill) => skill.command === command);
    const vault = store.get(atom_vaultHandle);
    return own && vault ? readUserSkill(vault, own.path) : null;
  }, [store, skillContext, userSkills]);

  // The skill a message's /command names, with its text; null otherwise.
  const commandSkill = useCallback(async (text: string): Promise<{ command: string; text: string; toolBindings?: CompanionToolName[]; projectChecks?: ProjectCheckId[] } | null> => {
    const listing = skillList().find((skill) => startsWithCommand(text, skill.command));
    if (!listing) return null;
    const skillText = await loadSkill(listing.command);
    return skillText ? { command: listing.command, text: skillText, ...(listing.toolBindings ? { toolBindings: listing.toolBindings } : {}), ...(listing.projectChecks ? { projectChecks: listing.projectChecks } : {}) } : null;
  }, [skillList, loadSkill]);

  return { skillList, loadSkill, commandSkill };
}
