"use client";

import React, { useState, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { atom_frontmatterWizardOpen, atom_vaultSetupWizardOpen } from "@/app/atoms/ui-atoms";
import { atom_vaultHandle, atom_vaultSetupStatus } from "@/app/atoms/vault-atoms";
import { atom_isDriveVault, atom_driveVaultId, atom_drivePathIndex, atom_driveAuthState } from "@/app/atoms/drive-atoms";
import * as driveClient from "@/app/services/drive/client";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import { LATEST_AGENT_VERSION, compareVersions } from "@/app/utils/agent-version";

// ---------------------------------------------------------------------------
// Managed Files (Vault Setup)
// ---------------------------------------------------------------------------

const MANAGED_FILES = [
  {
    path: "_agent-context.md",
    description: "Vault overview for background agents",
    content: `---
title: "agent-context"
status: active
version: "${LATEST_AGENT_VERSION}"
scope: "Vault overview for background agents and LLMs"
read_when: [any query, orientation, vault structure]
related: ["_skills/draft-note.md", "_skills/query-vault.md", "_skills/financial-table.md"]
tags: [agent, context, meta]
---

# Vault Context

This vault uses HermesMarkdown conventions.

## File Structure
All files live flat in the vault root. Skill and meta files are prefixed with \`_\`.

## Frontmatter Schema
Every file includes: \`title\`, \`status\`, \`scope\`, \`read_when\`, \`related\`, and \`tags\`.

## Tag Conventions
Document lifecycle: \`#draft\` → \`#active\` → \`#archived\`  
Task lifecycle: \`#todo\` → \`#prog\` → \`#done\`

## Financial Tables
Use \`Total:\` as a standalone line to auto-sum currency values above it.
Inside a pipe table, put \`Total:\` in a cell to sum **only that column**.

Example (column total):
\`\`\`
| Item   | Amount    |
|--------|-----------|
| Rent   | 2,000 RON |
| Food   | 400 RON   |
|        | Total:    |
\`\`\`

The currency is set by the user in Settings (e.g. RON, USD, EUR).
Format: \`1,234.56 RON\` or \`$1,234.56\`.
When asked to create a financial or budget table, always include a \`Total:\` row in the numeric column.

## Agent Instructions
- Use \`read_when\` to decide whether a file is relevant to the current query
- Use \`status: archived\` as a signal to deprioritise a file
- Never modify files prefixed with \`_\` unless explicitly instructed
`,
  },
  {
    path: "_skills/draft-note.md",
    description: "Instructions for creating new files",
    content: `---
title: "skill-draft-note"
status: active
version: "${LATEST_AGENT_VERSION}"
scope: "Instructions for creating new files in this vault"
read_when: [creating a file, drafting a note, new document]
related: ["_agent-context.md"]
tags: [agent, skill, authoring]
---

# Skill: Draft a New Note

## Filename
Use lowercase kebab-case. Prefix with date for journals: \`2026-06-08-standup.md\`.

## Required Frontmatter
Always include all six fields:
- \`title\` — short, lowercase, matches filename
- \`status\` — start with \`#draft\`
- \`scope\` — one sentence describing the file's purpose
- \`read_when\` — array of query contexts where this file is relevant
- \`related\` — array of related file paths
- \`tags\` — array of domain tags

## Body Structure
Use one \`#\` heading at the top matching the title.  
Use \`##\` for sections. Avoid deeper nesting unless necessary.  
Use typed code fences (\` \`\`\`js \`, \` \`\`\`bash \`, etc.) — never untyped.
`,
  },
  {
    path: "_skills/query-vault.md",
    description: "How to search and filter by frontmatter",
    content: `---
title: "skill-query-vault"
status: active
version: "${LATEST_AGENT_VERSION}"
scope: "How to search and filter this vault by frontmatter"
read_when: [searching, filtering, finding files, vault query]
related: ["_agent-context.md"]
tags: [agent, skill, search]
---

# Skill: Query the Vault

## By Status
Filter files where frontmatter \`status\` matches: \`draft\`, \`active\`, or \`archived\`.

## By Tag
Match files where \`tags\` array contains a given value.

## By read_when
Find files relevant to a query by matching the \`read_when\` array against query keywords.

## Prioritisation
1. \`status: active\` files over \`archived\`
2. Higher frontmatter completeness (all 6 fields present)
3. More recent \`related\` links to the current working file
`,
  },
  {
    path: "_skills/financial-table.md",
    description: "How to create financial/budget tables with auto-totals",
    content: `---
title: "skill-financial-table"
status: active
version: "${LATEST_AGENT_VERSION}"
scope: "How to create financial and budget tables with automatic column totals"
read_when: [financial table, budget, expenses, debt, payments, currency, total, sum]
related: ["_agent-context.md"]
tags: [agent, skill, finance, tables]
---

# Skill: Financial Tables

## Auto-Total Feature
HermesMarkdown automatically computes \`Total:\` values on every keystroke.

**Standalone total** — sums all currency values on plain-text lines above it:
\`\`\`
- Salary: 18,000 RON
- Expenses: 5,000 RON
Total: 23,000.00 RON
\`\`\`

**Column total** — put \`Total:\` in a table cell to sum only that column:
\`\`\`
| Creditor   | Plată     | Sold rămas  |
| :--------- | :-------- | :---------- |
| Ipoteca BT | 2,766 RON | 425,105 RON |
| Revolut    | 3,276 RON | 90,442 RON  |
| MOGO       | 780 RON   | 5,367 RON   |
|            | Total:    | Total:      |
\`\`\`
The editor fills in the computed sums automatically.

## Currency Format
- **RON**: \`2,766 RON\` or \`2,766RON\` (suffix)
- **USD**: \`$2,766\` or \`$2,766.50\` (prefix)
- **EUR**: \`€2,766\` (prefix)
Currency is set globally in Settings → Currency.

## Rules for AI
1. Always include a \`Total:\` cell in every numeric column of a financial table.
2. Use the user's configured currency symbol and format — never mix formats.
3. Leave the cell as exactly \`Total:\` — the editor computes and fills the value.
4. For debt payoff plans: columns are typically \`Plată\` (payment) and \`Sold rămas\` (remaining balance).
5. Do NOT hard-code the computed total — write \`Total:\` and let the editor calculate.
`,
  },
];

export default function VaultSetupWizard() {
  const [wizardPath, setWizardPath] = useAtom(atom_vaultSetupWizardOpen);
  const [, setFmWizardPath] = useAtom(atom_frontmatterWizardOpen);
  const isOpen = wizardPath !== null;
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const [, setSetupStatus] = useAtom(atom_vaultSetupStatus);
  const isDriveVault = useAtomValue(atom_isDriveVault);
  const driveVaultId = useAtomValue(atom_driveVaultId);
  const [drivePathIndex, setDrivePathIndex] = useAtom(atom_drivePathIndex);
  const [, setDriveAuthState] = useAtom(atom_driveAuthState);

  // Setup Checklist State
  const [installChecked, setInstallChecked] = useState<Record<string, boolean>>({});
  const [installResults, setInstallResults] = useState<Record<string, "installed" | "missing" | "outdated" | "error">>({});
  const [isInstalling, setIsInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    const hasVault = vaultHandle || (isDriveVault && driveVaultId);
    if (!isOpen || !hasVault) return;

    setInstallError(null);
    const initialChecked: Record<string, boolean> = {};

    const checkFiles = async () => {
      const nextResults: Record<string, "installed" | "missing" | "outdated" | "error"> = {};

      if (isDriveVault && driveVaultId) {
        for (const file of MANAGED_FILES) {
          const entry = drivePathIndex?.getEntry(file.path);
          if (!entry) {
            nextResults[file.path] = "missing";
            initialChecked[file.path] = true;
          } else {
            try {
              const text = await driveClient.getFileContent(entry.id);
              const match = text.match(/^version:\s*"?(\d+\.\d+)"?/m);
              const localVersion = match ? match[1] : "0.0";
              if (compareVersions(localVersion, LATEST_AGENT_VERSION) < 0) {
                nextResults[file.path] = "outdated";
                initialChecked[file.path] = true;
              } else {
                nextResults[file.path] = "installed";
              }
            } catch {
              nextResults[file.path] = "error";
            }
          }
        }
      } else if (vaultHandle) {
        for (const file of MANAGED_FILES) {
          try {
            const parts = file.path.split("/");
            let current: any = vaultHandle;
            for (let i = 0; i < parts.length - 1; i++) {
              current = await current.getDirectoryHandle(parts[i]);
            }
            const fileHandle = await current.getFileHandle(parts[parts.length - 1]);
            const fileData = await fileHandle.getFile();
            const text = await fileData.text();
            const match = text.match(/^version:\s*"?(\d+\.\d+)"?/m);
            const localVersion = match ? match[1] : "0.0";
            if (compareVersions(localVersion, LATEST_AGENT_VERSION) < 0) {
              nextResults[file.path] = "outdated";
              initialChecked[file.path] = true;
            } else {
              nextResults[file.path] = "installed";
            }
          } catch {
            nextResults[file.path] = "missing";
            initialChecked[file.path] = true;
          }
        }
      }

      setInstallResults(nextResults);
      setInstallChecked(initialChecked);
    };

    checkFiles();
  }, [isOpen, vaultHandle, isDriveVault, driveVaultId, drivePathIndex]);

  if (!isOpen) return null;

  const closeAndContinue = () => {
    const path = wizardPath;
    setWizardPath(null);
    if (path && path !== "vault-root") {
      setFmWizardPath(path);
    }
  };

  const handleNext = async () => {
    const selected = MANAGED_FILES.filter(f => installChecked[f.path] && (installResults[f.path] === "missing" || installResults[f.path] === "outdated"));

    if (selected.length > 0) {
      setIsInstalling(true);
      setInstallError(null);
      try {
        if (isDriveVault && driveVaultId) {
          for (const file of selected) {
            const parts = file.path.split("/");
            let parentId = driveVaultId;

            for (let i = 0; i < parts.length - 1; i++) {
              const folderName = parts[i];
              const folderPath = parts.slice(0, i + 1).join("/");
              const existing = drivePathIndex?.getEntry(folderPath);
              if (existing) {
                parentId = existing.id;
              } else {
                const newFolder = await driveClient.createFolder(folderName, parentId);
                drivePathIndex?.addEntry(folderPath, {
                  id: newFolder.id,
                  name: newFolder.name,
                  mimeType: driveClient.FOLDER_MIME,
                  modifiedAt: new Date(newFolder.modifiedTime).getTime(),
                  parentId,
                });
                parentId = newFolder.id;
              }
            }

            const existingEntry = drivePathIndex?.getEntry(file.path);
            if (existingEntry) {
              await driveClient.updateFile(existingEntry.id, file.content);
            } else {
              const fileName = parts[parts.length - 1];
              const driveFile = await driveClient.createFile(fileName, parentId, file.content);
              drivePathIndex?.addEntry(file.path, {
                id: driveFile.id,
                name: driveFile.name,
                mimeType: "text/markdown",
                modifiedAt: new Date(driveFile.modifiedTime).getTime(),
                parentId,
              });
            }
          }
          if (drivePathIndex) {
            drivePathIndex.saveToCache(driveVaultId);
            setDrivePathIndex(drivePathIndex);
          }
        } else if (vaultHandle) {
          for (const file of selected) {
            const parts = file.path.split("/");
            let current: any = vaultHandle;
            for (let i = 0; i < parts.length - 1; i++) {
              current = await current.getDirectoryHandle(parts[i], { create: true });
            }
            const handle = await current.getFileHandle(parts[parts.length - 1], { create: true });
            const writable = await handle.createWritable();
            await writable.write(file.content);
            await writable.close();
          }
        } else {
          throw new Error("No vault opened");
        }
        setSetupStatus("configured");
        setIsInstalling(false);
        setInstallSuccess(true);
      } catch (err: any) {
        console.error("Setup failed:", err);
        if (err?.status === 401) setDriveAuthState("expired");
        setInstallError(err?.message || "An unexpected error occurred. Please try again.");
        setIsInstalling(false);
      }
    } else {
      closeAndContinue();
    }
  };

  const handleSkip = () => {
    localStorage.setItem("hermesSkipVaultSetup", LATEST_AGENT_VERSION);
    setSetupStatus("skipped");
    const path = wizardPath;
    setWizardPath(null);
    if (path && path !== "vault-root") {
      setFmWizardPath(path);
    }
  };

  const hasOutdatedFiles = Object.values(installResults).some(r => r === "outdated");


  return (
    <DialogModal
      isOpened={isOpen}
      onClose={() => setWizardPath(null)}
      onConfirm={handleNext}
      styles="sm:!max-w-md"
      mobileSheet
      ariaLabelledBy="vault-setup-heading"
    >
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col gap-1 pr-6">
          <h2
            id="vault-setup-heading"
            className="text-ui-body font-semibold text-zinc-900 dark:text-zinc-100"
          >
            {hasOutdatedFiles ? "Agent Skills Update" : "Vault Setup"}
          </h2>
          <p className="text-ui-footnote text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {hasOutdatedFiles
              ? "New versions of the agent-aware skill files are available for your vault."
              : "HermesMarkdown works best with a few helper files in your vault root — they guide AI tools like Cursor or Claude when you work with your notes. HermesMarkdown itself does not provide any AI agent."}
          </p>
        </div>

        {/* Success */}
        {installSuccess && (
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
              <p className="text-ui-footnote font-semibold text-emerald-700 dark:text-emerald-400">
                {hasOutdatedFiles ? "Skills updated successfully." : "Skills installed successfully."}
              </p>
              <p className="text-ui-caption text-emerald-600 dark:text-emerald-500">
                Your vault is ready. Agent-context files are in place.
              </p>
            </div>
            <div className="flex justify-end pt-1">
              <Button variant="primary" onClick={closeAndContinue}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className={`flex flex-col gap-4 ${installSuccess ? "hidden" : ""}`}>
          {!vaultHandle && !isDriveVault ? (
            <p className="text-ui-footnote text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800">
              Open a vault folder first to install these agent-context files.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {MANAGED_FILES.map((file) => (
                <div key={file.path} className="flex items-start gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      id={`setup-${file.path}`}
                      checked={installChecked[file.path] || installResults[file.path] === "installed"}
                      disabled={installResults[file.path] === "installed" || isInstalling}
                      onChange={(e) => setInstallChecked(prev => ({ ...prev, [file.path]: e.target.checked }))}
                      className="w-4 h-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500 disabled:opacity-50"
                    />
                  </div>
                  <label htmlFor={`setup-${file.path}`} className={`flex flex-col flex-1 cursor-pointer ${installResults[file.path] === "installed" ? "opacity-50" : ""}`}>
                    <span className="text-ui-footnote font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      {file.path}
                      {installResults[file.path] === "installed" && <span className="text-emerald-500 text-[10px] uppercase font-bold">Already Installed</span>}
                      {installResults[file.path] === "outdated" && <span className="text-blue-500 text-[10px] uppercase font-bold">Update Available</span>}
                    </span>
                    <span className="text-ui-caption text-zinc-500 dark:text-zinc-400">
                      {file.description}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {!installSuccess && installError && (
          <p className="text-ui-footnote text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2.5 rounded-lg border border-red-100 dark:border-red-800">
            {installError}
          </p>
        )}

        {/* Actions */}
        {!installSuccess && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button variant="outlined" onClick={handleSkip} disabled={isInstalling}>
              Skip
            </Button>
            <Button variant="primary" onClick={handleNext} disabled={isInstalling || (!vaultHandle && !isDriveVault)}>
              {isInstalling ? (hasOutdatedFiles ? "Updating..." : "Installing...") : (hasOutdatedFiles ? "Update & Continue" : "Install & Continue")}
            </Button>
          </div>
        )}
      </div>
    </DialogModal>
  );
}
