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
Table cells support Excel-style formulas: \`=SUM(B2:D2)\`, \`=AVERAGE(...)\`,
\`=IF(...)\`, and more. \`A\`/\`B\`/\`C\`... are columns; row 1 is the header,
row 2 is the first data row.

Example (column total):
\`\`\`
| Item   | Amount  |
|--------|---------|
| Rent   | $2,000  |
| Food   | $400    |
|        | =SUM(B2:B3) |
\`\`\`

Currency symbols ($, €, £, etc.) in referenced cells are stripped
automatically — formulas work whether a cell is \`2000\`, \`$2,000\`, or
\`2,000 USD\`, prefix or suffix, with or without a space. No currency setting
needed.

## Context Loading Protocol
See \`.hermes/AGENTS.md\` for the full context loading protocol (how to read
\`.hermes/index.yaml\`, the read_when/scope tiers, and staleness handling).
Read that file first, before this one, for any agent task.

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
    description: "How to create financial/budget tables with formulas",
    content: `---
title: "skill-financial-table"
status: active
version: "${LATEST_AGENT_VERSION}"
scope: "How to create financial and budget tables using Excel-style formulas"
read_when: [financial table, budget, expenses, debt, payments, currency, total, sum, formula]
related: ["_agent-context.md"]
tags: [agent, skill, finance, tables]
---

# Skill: Financial Tables

## Formula Engine
Any table cell starting with \`=\` is a live formula, evaluated against the
table's own cells using A1-style references: column 0 is \`A\`, column 1 is
\`B\`, etc. Row 1 is the header row; row 2 is the first data row.

Supported: \`SUM AVERAGE MIN MAX COUNT COUNTA ABS ROUND IF AND OR NOT CONCAT\`,
arithmetic (\`+ - * /\`), and comparisons (\`= <> < > <= >=\`).

**Column total** — sum a range of cells:
\`\`\`
| Creditor   | Payment   | Remaining Balance |
| :--------- | :-------- | :----------------- |
| Loan A     | $1,200    | $50,000             |
| Loan B     | $800      | $20,000             |
| Loan C     | $300      | $5,000              |
|            | =SUM(B2:B4) | =SUM(C2:C4)       |
\`\`\`
The editor shows the computed result live; the formula itself is what's
saved to the file.

## Currency-Agnostic
Referenced cells can hold \`2766\`, \`$2,766\`, \`2766USD\`, or \`€2,766\` —
the engine strips any recognized currency symbol (any placement, with or
without a space) before coercing to a number. No currency setting needed.

## Rules for AI
1. Use a formula (\`=SUM(...)\`, \`=AVERAGE(...)\`, etc.) for any computed cell — never hard-code the result.
2. Reference the actual data range above the formula cell with A1 notation.
3. For debt payoff plans: columns are typically \`Payment\` and \`Remaining Balance\`.
4. Formulas only resolve within the same table — there's no cross-table reference support.
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

// Drive allows multiple files/folders with the identical name in one parent,
// so a check-then-create against the (possibly stale) cached drivePathIndex
// is a race: if the cache hasn't caught up yet, this would create a
// duplicate `.hermes` folder/file every time setup runs. List the parent
// live and take the oldest (lowest-id) match instead, self-healing any
// duplicate files left over from before this fix — mirrors the fix already
// applied to index.yaml writes in vault-index.ts.
async function findExisting(
  parentId: string,
  name: string,
  mimeType?: string,
): Promise<driveClient.DriveFile[]> {
  const matches: driveClient.DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const { files, nextPageToken } = await driveClient.listFiles(parentId, pageToken);
    for (const f of files) {
      if (f.name === name && (!mimeType || f.mimeType === mimeType)) matches.push(f);
    }
    pageToken = nextPageToken;
  } while (pageToken);
  return matches.sort((a, b) => a.id.localeCompare(b.id));
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
        const existing = await findExisting(parentId, folderName, driveClient.FOLDER_MIME);
        if (existing.length > 0) {
          parentId = existing[0].id;
          drivePathIndex?.addEntry(folderPath, {
            id: existing[0].id,
            name: existing[0].name,
            mimeType: driveClient.FOLDER_MIME,
            modifiedAt: new Date(existing[0].modifiedTime).getTime(),
            parentId,
          });
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

      const fileName = parts[parts.length - 1];
      const existingFiles = await findExisting(parentId, fileName);
      if (existingFiles.length > 0) {
        await driveClient.updateFile(existingFiles[0].id, file.content);
        for (const dupe of existingFiles.slice(1)) {
          try {
            await driveClient.deleteFile(dupe.id);
          } catch {
            // best-effort cleanup — leaving a stale duplicate is harmless
          }
        }
        drivePathIndex?.addEntry(file.path, {
          id: existingFiles[0].id,
          name: existingFiles[0].name,
          mimeType: "text/markdown",
          modifiedAt: Date.now(),
          parentId,
        });
      } else {
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
    if (typeof (vaultHandle as any).queryPermission === "function") {
      const permState = await (vaultHandle as any).queryPermission({ mode: "readwrite" });
      if (permState !== "granted") {
        const newState = await (vaultHandle as any).requestPermission({ mode: "readwrite" });
        if (newState !== "granted") {
          throw new Error("Write permission denied. Re-open the vault to restore access.");
        }
      }
    }
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
