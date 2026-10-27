"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_templatesFolder } from "@/app/atoms/template-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { isTemplatePath } from "@/app/utils/templates/template-registry";
import { CHAT_SKILLS, isSkillActive, type ChatSkill } from "./chat-skills";
import { openTasksBlock } from "./skill-context";
import { isUserSkillActive, readUserSkill, userSkillsFrom } from "./user-skills";

// The AI companion's skills: which skill text a turn sends (each active
// built-in skill's instructions, plus the open tasks the tasks skill works
// from, and the user's own skill notes turned on by their /command, read
// fresh each turn).
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

  // Skill text for the next request, given the thread including the new user message.
  const skillInstructionsFor = useCallback(async (userTexts: string[]): Promise<string[]> => {
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

  return { skillInstructionsFor };
}
