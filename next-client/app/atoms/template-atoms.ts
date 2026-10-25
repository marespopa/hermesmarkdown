import { atom } from "jotai";
import { atom_fileMetadata } from "./metadata";
import {
  listTemplates,
  resolveTemplatesFolder,
  type TemplateEntry,
} from "@/app/utils/templates/template-registry";

// The templates folder: always `_templates/` at the vault root, and whether it
// holds any file yet (it's created on first use).
export const atom_templatesFolder = atom((get) => resolveTemplatesFolder(Object.keys(get(atom_fileMetadata))));

// Every template: a `.md` file directly in `_templates/`, or one folder down
// (a pack); loose ones first, then by pack and name. Derived from the
// metadata index, so it follows every rescan; bodies are read on use.
export const atom_templates = atom<TemplateEntry[]>((get) =>
  listTemplates(get(atom_templatesFolder).folder, Object.keys(get(atom_fileMetadata))),
);

// The open template picker or prompts form (ephemeral). Resolving with null
// cancels the whole action.
export type TemplateDialogRequest =
  | {
      kind: "pick";
      includeBlank: boolean;
      title: string;
      /** Path of the template to put first and highlight (the one a link's name points to). */
      preselect?: string;
      resolve: (value: TemplateEntry | "blank" | "board" | null) => void;
    }
  | {
      kind: "prompts";
      labels: string[];
      confirmLabel: string;
      resolve: (value: Record<string, string> | null) => void;
    };

export const atom_templateDialog = atom<TemplateDialogRequest | null>(null);
