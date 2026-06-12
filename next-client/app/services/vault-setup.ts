import * as driveClient from "@/app/services/drive/client";
import { LATEST_AGENT_VERSION, compareVersions } from "@/app/utils/agent-version";

export interface ManagedFile {
  path: string;
  description: string;
  content: string;
}

export type FileInstallStatus = "installed" | "missing" | "outdated" | "error";

export const MANAGED_FILES: ManagedFile[] = [
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

## Context Loading Protocol

Before loading any file into context, follow this exact sequence:

### Step 1 — Filter by read_when
Read \`.hermes/index.yaml\` first — it is a frontmatter-only index with no file body content.
Check the \`read_when\` field of every entry against the current task.
- If \`read_when\` is empty or does not match the task: skip the file entirely (Tier 0)
- If \`read_when\` matches, or is set to \`always\`: proceed to Step 2
- If \`read_when\` is set to \`never\`: skip unconditionally

### Step 2 — Load scope only (Tier 1)
For all files that passed Step 1, read their \`scope\` field from the index.
The \`scope\` is a one-sentence summary of what the file covers.
If the task can be completed using scope fields alone: do not load full file content.

### Step 3 — Load full content only if needed (Tier 2)
If a specific file's scope is insufficient for the task, load its full content.
Load files one at a time and re-evaluate after each load whether more are needed.
Do not pre-load multiple files in full — load on demand.
Files with no \`scope\` field must be loaded in full if \`read_when\` matches.

### read_when format
Entries in \`read_when\` follow these conventions:
- Plain sentence: \`"user is asking about X"\` — semantic match
- Keyword hint: \`"keywords: a, b, c"\` — keyword match first, semantic fallback
- Always load: \`"always"\` — included regardless of task
- Never load: \`"never"\` — excluded from all agent context

### Staleness
\`.hermes/index.yaml\` is maintained automatically by the editor.
If its \`generated\` timestamp is older than 5 minutes, the editor may not have been
running during recent agent writes — warn the user if stale data could affect the task.

## Agent Instructions
- Never modify files prefixed with \`_\` unless explicitly instructed
- Use \`status: archived\` as a signal to deprioritise a file
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

export async function checkVaultFiles(
  vaultHandle: FileSystemDirectoryHandle | null,
  isDriveVault: boolean,
  driveVaultId: string | null,
  drivePathIndex: any | null
): Promise<Record<string, FileInstallStatus>> {
  const results: Record<string, FileInstallStatus> = {};

  if (isDriveVault && driveVaultId) {
    for (const file of MANAGED_FILES) {
      const entry = drivePathIndex?.getEntry(file.path);
      if (!entry) {
        results[file.path] = "missing";
      } else {
        try {
          const text = await driveClient.getFileContent(entry.id);
          const match = text.match(/^version:\s*"?(\d+\.\d+)"?/m);
          const localVersion = match ? match[1] : "0.0";
          if (compareVersions(localVersion, LATEST_AGENT_VERSION) < 0) {
            results[file.path] = "outdated";
          } else {
            results[file.path] = "installed";
          }
        } catch {
          results[file.path] = "error";
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
          results[file.path] = "outdated";
        } else {
          results[file.path] = "installed";
        }
      } catch {
        results[file.path] = "missing";
      }
    }
  }

  return results;
}

export async function installVaultFiles(
  filesToInstall: ManagedFile[],
  vaultHandle: FileSystemDirectoryHandle | null,
  isDriveVault: boolean,
  driveVaultId: string | null,
  drivePathIndex: any | null
): Promise<void> {
  if (isDriveVault && driveVaultId) {
    for (const file of filesToInstall) {
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
  } else if (vaultHandle) {
    for (const file of filesToInstall) {
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
}
