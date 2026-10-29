"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_vaultHandle, resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { useNoteBuffer } from "@/app/hooks/file-system/use-note-buffer";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { isPrivateContent, isPrivateFrontmatter } from "@/app/utils/note-privacy";
import { useCompanionWrites } from "../companion/use-companion-writes";
import { useCompanionOrganise } from "../companion/use-companion-organise";
import { PROJECT_CHECKS, type ProjectCheckId } from "@/app/services/project-checks";
import { COMPANION_SKILL_TOOL_BINDINGS, type CompanionToolName } from "@/app/services/companion-tool-defs";
import { parseSkillDocument, serializeSkillDocument } from "./skill-frontmatter";
import { CHAT_SKILLS } from "./chat-skills";
import { COMPANION_COMMANDS } from "../companion/companion-commands";
import { skillCommandFor, userSkillsFrom } from "./user-skills";

export interface SkillDraftState {
  name: string;
  description: string;
  body: string;
  toolBindings: CompanionToolName[];
  projectChecks: ProjectCheckId[];
  frontmatter: Record<string, unknown>;
}
const EMPTY: SkillDraftState = { name: "", description: "", body: "", toolBindings: [], projectChecks: [], frontmatter: {} };
const fileName = (path: string) => (path.split("/").pop() ?? path).replace(/\.md$/i, "");

export function useSkillWizard(open: boolean, skillPath?: string, onSaved?: () => void) {
  const store = useStore();
  const { readCurrentText } = useNoteBuffer();
  const writes = useCompanionWrites();
  const organise = useCompanionOrganise();
  const { scanVault, indexVaultTags } = useFileSystem();
  const [draft, setDraft] = useState<SkillDraftState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parseFailure, setParseFailure] = useState(false);
  const loadedText = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null); setWarnings([]); setParseFailure(false); setDraft(EMPTY); loadedText.current = null;
    if (!skillPath) return () => { cancelled = true; };
    setLoading(true);
    void readCurrentText(skillPath).then(async (text) => {
      const parsed = await parseSkillDocument(text);
      loadedText.current = text;
      if (cancelled) return;
      setDraft({ name: fileName(skillPath), description: parsed.description ?? "", body: parsed.body, toolBindings: parsed.toolBindings ?? [], projectChecks: parsed.projectChecks ?? [], frontmatter: parsed.frontmatter });
      setWarnings(parsed.errors);
      setParseFailure(parsed.errors.some((item) => item.startsWith("Frontmatter is not valid") || item.includes("YAML frontmatter") || item.includes("mapping")));
    }).catch(() => { if (!cancelled) setError("Could not read this skill from the open vault."); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, skillPath, readCurrentText]);

  const save = useCallback(async () => {
    const name = draft.name.trim();
    if (!name || /[\\/]/.test(name) || name.startsWith(".")) { setError("Choose a name without slashes or a leading dot."); return false; }
    if (!draft.body.trim()) { setError("Add instruction text before saving."); return false; }
    const title = name.replace(/\.md$/i, "");
    const folder = skillPath?.includes("/") ? skillPath.slice(0, skillPath.lastIndexOf("/") + 1) : "";
    const path = `${folder}${title}.md`;
    const command = skillCommandFor(path);
    const taken = [...CHAT_SKILLS.map((skill) => skill.command), ...COMPANION_COMMANDS];
    const collisions = userSkillsFrom(store.get(atom_fileMetadata), taken).some((skill) => skill.command === command && skill.path !== skillPath);
    if (taken.includes(command) || collisions) { setError("That skill name is already in use. Choose another name."); return false; }
    if (parseFailure) { setError("Fix the existing frontmatter before saving so unrelated metadata is not lost."); return false; }
    if (draft.toolBindings.some((tool) => !COMPANION_SKILL_TOOL_BINDINGS.includes(tool)) || draft.projectChecks.some((check) => !PROJECT_CHECKS.some((item) => item.id === check))) {
      setError("One or more bindings are not in the fixed allowlist."); return false;
    }
    const vault = store.get(atom_vaultHandle);
    if (!vault) { setError("Open a vault before creating or editing a skill."); return false; }
    setSaving(true); setError(null);
    try {
      if (skillPath) {
        const currentText = await readCurrentText(skillPath);
        if (loadedText.current !== null && currentText !== loadedText.current) { setError("This skill changed on disk while it was open. Close and reopen it before saving."); return false; }
      }
      const content = await serializeSkillDocument({ ...draft, name: title });
      if (skillPath) {
        const metadata = store.get(atom_fileMetadata)[skillPath];
        if (isPrivateFrontmatter(metadata?.frontmatter)) { setError("Private skills cannot be edited here."); return false; }
        try {
          const handle = await resolveFileHandleAtPath(vault, skillPath);
          const current = await (await handle.getFile()).text();
          if (isPrivateContent(current)) { setError("Private skills cannot be edited here."); return false; }
        } catch { setError("This skill no longer exists in the vault."); return false; }
        const turnId = `skill-wizard-${Date.now()}`;
        let writePath = skillPath;
        if (path !== skillPath) {
          const renamed = await organise.rename(turnId, skillPath, `${title}.md`);
          if (renamed.detail) { setError(renamed.output); return false; }
          writePath = path;
        }
        const result = await writes.writeFile(turnId, writePath, content);
        if (result.detail === "failed" || result.detail === "private" || result.detail === "not found" || result.detail === "refused" || result.detail === "save failed") { setError(result.output); return false; }
      } else {
        const result = await writes.createFile(`skill-wizard-${Date.now()}`, path, content, true);
        if (result.detail) { setError(result.output); return false; }
      }
      void scanVault(vault).then(() => indexVaultTags());
      onSaved?.();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save this skill.");
      return false;
    } finally { setSaving(false); }
  }, [draft, parseFailure, skillPath, store, writes, organise, scanVault, indexVaultTags, onSaved, readCurrentText]);

  return { draft, setDraft, loading, saving, error, warnings, save };
}
