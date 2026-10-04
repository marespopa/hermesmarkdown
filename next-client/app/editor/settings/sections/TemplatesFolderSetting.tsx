"use client";

import React, { useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { atom_vaultKey } from "@/app/atoms/vault-atoms";
import { atom_templateFolderSettings, atom_templatesFolder } from "@/app/atoms/template-atoms";
import { BareInput } from "@/app/components/Input";
import { normalizeFolderPath } from "@/app/hooks/file-system/unique-file";
import { SettingItem } from "../components/SettingControls";

const DOT_FOLDER_HINT = "Folders starting with . aren't indexed. Pick another folder.";

// `.hermes/tpl` style paths (`.` and `..` segments are dropped by normalizing instead).
const hasDotFolder = (path: string) =>
  path.split(/[\\/]/).map((s) => s.trim()).some((s) => s.startsWith(".") && s !== "." && s !== "..");

// Settings → Files → Templates Folder, saved per vault. Empty uses the first
// existing default folder (templates, _templates, Templates).
export default function TemplatesFolderSetting() {
  const vaultKey = useAtomValue(atom_vaultKey);
  const [settings, setSettings] = useAtom(atom_templateFolderSettings);
  const { folder } = useAtomValue(atom_templatesFolder);
  // The typed text while editing; null shows the saved value.
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saved = vaultKey ? settings[vaultKey] ?? "" : "";

  const commit = () => {
    if (draft === null || !vaultKey) return;
    if (hasDotFolder(draft)) {
      setError(DOT_FOLDER_HINT);
      return;
    }
    const normalized = normalizeFolderPath(draft);
    const next = { ...settings };
    if (normalized) next[vaultKey] = normalized;
    else delete next[vaultKey];
    setSettings(next);
    setDraft(null);
    setError(null);
  };

  return (
    <SettingItem
      label="Templates Folder"
      description="Every .md file directly in this folder is a template, used by /template, missing links and New note from template…. Leave empty to use templates, _templates or Templates."
      control={
        <div className="flex flex-col items-end gap-1">
          <BareInput
            value={draft ?? saved}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            onBlur={commit}
            placeholder={folder}
            disabled={!vaultKey}
            aria-label="Templates folder"
            aria-invalid={!!error}
            className="h-8 w-44 rounded-lg border border-edge bg-input-bg px-2 text-ui-footnote text-fg outline-none placeholder:text-fg-faint focus:ring-4 focus:ring-sage/10 disabled:opacity-50"
          />
          {error && <span role="alert" className="w-44 text-ui-caption leading-snug text-fg-muted">{error}</span>}
        </div>
      }
    />
  );
}
