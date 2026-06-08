# Agent Skills & Vault Setup

## Overview

HermesMarkdown includes a **Vault Setup Wizard** that automatically provisions new or existing vaults with essential "agent-aware" context and skill files. These files live in the root and `_skills/` directories of the user's local vault.

### Managed Files
- `_agent-context.md`: High-level vault structure and agent instructions.
- `_skills/draft-note.md`: Instructions for drafting new notes with correct frontmatter and structure.
- `_skills/query-vault.md`: Instructions on how to search and filter the vault.

## Current Implementation (v1)

- **Trigger**: The wizard checks for the existence of `_agent-context.md` when a vault is opened. If missing (and the user hasn't opted to skip), the `VaultSetupWizard` is presented.
- **Versioning**: All injected files contain a `version: 1` field in their frontmatter.
- **Decoupling**: The setup wizard is fully decoupled from the `FrontmatterWizard`. If a user creates a new file in an unconfigured vault, the Setup Wizard intercepts the flow, completes the setup, and then seamlessly chains into the Frontmatter Wizard.

## Future Strategy: Auto-Updating Skill Files

Because HermesMarkdown relies on these files to orchestrate agent behavior, the schema and instructions will inevitably evolve. We have laid the groundwork for future updates through frontmatter versioning.

### Proposed Update Flow

1. **Detection**: 
   - During vault initialization or a background sync (`useVaultManager`), the app reads the frontmatter of existing managed files.
   - It compares the local `version` against the latest version defined in the app's internal `MANAGED_FILES` manifest.

2. **User Notification**:
   - If an outdated file is detected (`local_version < manifest_version`), the `VaultSetupWizard` (or a dedicated Update Modal) can be re-triggered.
   - The UI will show these files as "Update Available" rather than "Missing".

3. **Applying Updates**:
   - When the user confirms the update, the app overwrites the outdated file with the new content from the manifest, bumping the local version.
   - *Consideration for User Edits*: If users are expected to modify these files, a simple overwrite might destroy their customizations. In the future, we could implement a 3-way merge, or simply rename the user's modified file to `_skills/draft-note.old.md` before writing the updated version. For now, strict overwrites based on version mismatches are the simplest path.

4. **Remote Manifests (vNext)**:
   - Instead of hardcoding `MANAGED_FILES` in the React source, the app could fetch a JSON manifest from a remote endpoint, allowing skill files to be updated dynamically without requiring a full app release.
