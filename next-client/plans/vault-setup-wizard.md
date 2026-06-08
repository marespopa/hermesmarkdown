# PRD & Implementation Plan — Vault Setup Wizard

**Product:** HermesMarkdown  
**Feature:** Expand Frontmatter Wizard → Unified File Setup Wizard  
**Status:** #draft  
**Author:** Mares Popa (Adapted by Gemini CLI)  
**Last updated:** 2026-06-08

---

## 1. Problem Statement

HermesMarkdown is positioned as an agent-readable workspace. For that promise to hold, vaults need a baseline set of skill and context files that agents can consume. Currently there is no mechanism to install these files, and users who want agent-aware vaults must add them manually.

A second wizard (separate from frontmatter onboarding) would fragment the setup experience. The opportunity is to extend the existing frontmatter wizard into a single, cohesive onboarding flow that handles both vault bootstrapping and file metadata — appearing seamlessly on new file creation, and disappearing once the vault is already configured.

---

## 2. Goals

- Install agent skill files into the vault without leaving the editor.
- Detect already-installed files and never overwrite them.
- Reuse the existing wizard UI shell — no new modal patterns.
- Add zero friction for users whose vault is already set up.
- Give users a clear, one-time setup moment rather than a background assumption.

---

## 3. Non-Goals

- Building an MCP server or external agent protocol (out of scope for this release).
- Version management or auto-updating of installed skill files.
- Vault-level settings panel (separate feature).
- Any cloud sync or remote file delivery.

---

## 4. Feature Overview

### 4.1 Wizard Step Structure (revised)

We treat the setup as the very first step in a cohesive wizard.

```
[Step 0 — Vault Setup]  ← NEW, conditional
        ↓
[Step 1 — Identify]     ← existing Frontmatter step
[Step 2 — Describe]     ← existing Frontmatter step
[Step 3 — Tag]          ← existing Frontmatter step
[Step 4 — Context]      ← existing Frontmatter step
```

**Step 0 is shown only when one or more managed files are missing from the vault.**  
If all managed files are present, the wizard opens directly on the Identify step as today.

### 4.2 Managed File Manifest

| File path | Description | Required |
|---|---|---|
| `_agent-context.md` | Vault overview for agents — structure, tag conventions, how to navigate | Yes |
| `_skills/draft-note.md` | Instructions for creating new files correctly | Yes |
| `_skills/query-vault.md` | How to search and filter by frontmatter fields | Yes |

All files are written to the vault root as accessed via the File System Access API.

### 4.3 Detection Logic

Before opening the wizard, the app checks the vault for each managed file:
```javascript
for each file in MANIFEST:
  try vaultHandle.getFileHandle(file.path)
    → mark as INSTALLED
  catch NotFoundError
    → mark as MISSING
```

---

## 5. Implementation Strategy

### 5.1 State Management & Detection Logic
- **File**: `app/editor/components/FrontmatterWizard.tsx`
- Import `atom_vaultHandle` from `app/atoms/vault-atoms.ts`.
- Add state variables to track setup status (`setupStatus: 'idle' | 'checking' | 'needs_setup' | 'done'`), missing files, and selected files for installation.
- Implement a `useEffect` that runs when the wizard opens.
  - Check `localStorage.getItem("hermesSkipVaultSetup")`. If true, set status to `done`.
  - If not skipped, verify the existence of the three managed files using `vaultHandle.getFileHandle()`.
  - If any file is missing, set status to `needs_setup`. If all exist, set status to `done`.

### 5.2 UI Updates
- **File**: `app/editor/components/FrontmatterWizard.tsx`
- If `setupStatus === 'needs_setup'`, dynamically prepend the "Vault Setup" UI as Step 0.
- Render a Checklist UI for the setup phase:
  - Installed files: Greyed out label, ✅ icon, disabled unchecked checkbox.
  - Missing files: Checked by default checkbox.
  - Actions: "Install selected → Continue" (Primary) and "Skip for now" (Outlined/Secondary).
- Ensure the step indicator dots and header text correctly reflect the current phase.

### 5.3 File Writing Logic
- Implement the "Install selected" handler in `FrontmatterWizard.tsx`.
- For each selected file:
  - Extract the directory path (e.g., `_skills`).
  - Use `vaultHandle.getDirectoryHandle('_skills', { create: true })` if necessary.
  - Use `dirHandle.getFileHandle(filename, { create: true })` to create the file.
  - Write the predefined markdown content via `createWritable()`.
  - If any write fails, mark that row as `WRITE_ERROR` without blocking other writes.
- On completion, transition to the first Frontmatter step.

### 5.4 Testing
- **File**: `app/editor/components/FrontmatterWizard.test.tsx` (New)
- Mock `atom_vaultHandle` and other Jotai atoms.
- Verify that the setup step appears when files are missing and is skipped when all are present or when the user has chosen to skip.
- Ensure all tests are strictly behavior-driven and run entirely client-side without real file system access.
