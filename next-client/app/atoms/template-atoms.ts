import { atom } from "jotai";
import { atom_fileMetadata } from "./metadata";
import {
  listFolderTemplates,
  listTemplates,
  resolveTemplatesFolder,
  type FolderTemplate,
  type TemplateEntry,
} from "@/app/utils/templates/template-registry";

// The templates folder: always `_templates/` at the vault root, and whether it
// holds any file yet (it's created on first use).
export const atom_templatesFolder = atom((get) => resolveTemplatesFolder(Object.keys(get(atom_fileMetadata))));

// Folder templates: direct subfolders of `_templates/` whose README.md has
// `scaffold: true`. Derived from the index; never packs, and their files are
// not in `atom_templates`.
export const atom_folderTemplates = atom<FolderTemplate[]>((get) =>
  listFolderTemplates(get(atom_templatesFolder).folder, get(atom_fileMetadata)),
);

// Every template: a `.md` file directly in `_templates/`, or one folder down
// (a pack); loose ones first, then by pack and name. Derived from the
// metadata index, so it follows every rescan; bodies are read on use.
export const atom_templates = atom<TemplateEntry[]>((get) =>
  listTemplates(
    get(atom_templatesFolder).folder,
    Object.keys(get(atom_fileMetadata)),
    new Set(get(atom_folderTemplates).map((t) => t.name)),
  ),
);

// What the template wizard answers: the kind, the name, and what to start
// from: "blank", "example:<id>" (a built-in: a starter's path for a note, a
// BUILTIN_FOLDER_TEMPLATES id for a folder) or "vault" (a folder in the vault,
// picked next). `askName`: the folder template asks for its folder's name.
// `pack`: the note template goes in `_templates/<pack>/` (made if new).
export type TemplateWizardResult =
  | { kind: "note"; name: string; from: "blank" | `example:${string}`; pack?: string }
  | { kind: "folder"; name: string; from: "blank" | "vault" | `example:${string}`; askName: boolean };

// What the template wizard opens on: a kind, and a built-in example to start
// from (the Templates page's examples) or a pack to put it in (a pack's New).
export type TemplateWizardPreset = { kind: TemplateWizardResult["kind"]; from?: `example:${string}`; pack?: string };

// The open template picker, prompts form or template wizard (ephemeral). Resolving with null
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
    }
  | {
      kind: "wizard";
      preset?: TemplateWizardPreset;
      resolve: (value: TemplateWizardResult | null) => void;
    };

export const atom_templateDialog = atom<TemplateDialogRequest | null>(null);
