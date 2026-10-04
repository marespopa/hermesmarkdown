import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { atom_fileMetadata } from "./metadata";
import { atom_vaultKey } from "./vault-atoms";
import {
  listTemplates,
  resolveTemplatesFolder,
  type TemplateEntry,
} from "@/app/utils/templates/template-registry";

// Settings → Files → Templates Folder, keyed by vault (see atom_vaultKey).
// A missing key means "use the default folders".
export const atom_templateFolderSettings = atomWithStorage<Record<string, string>>(
  "hermes_template_folders",
  {},
);

// The templates folder in use for the open vault, and whether it holds any file.
export const atom_templatesFolder = atom((get) => {
  const vaultKey = get(atom_vaultKey);
  const setting = vaultKey ? get(atom_templateFolderSettings)[vaultKey] : undefined;
  return resolveTemplatesFolder(setting, Object.keys(get(atom_fileMetadata)));
});

// Every template (direct `.md` child of the folder), sorted by name. Derived
// from the metadata index, so it follows every rescan; bodies are read on use.
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
      resolve: (value: TemplateEntry | "blank" | null) => void;
    }
  | {
      kind: "prompts";
      labels: string[];
      confirmLabel: string;
      resolve: (value: Record<string, string> | null) => void;
    };

export const atom_templateDialog = atom<TemplateDialogRequest | null>(null);
