# GitHubVaultDialog

Description: Connect-a-GitHub-repository flow. It handles sign-in, lists and picks repositories, previews the tree, can create a repository, then opens the repository as a vault.

## Local State & Storage
- State: `atom_githubVaultDialogOpen`. Repository list, page, selection, and loading are local useState.
- Persistence: The selected vault descriptor and manifest go to IndexedDB (`HermesMDVaultDB`, keys `lastGithubVault` and `githubManifest:*`) through `useFileSystem`.

## Dependencies
- Core: `DialogModal`, `Button`, `Input`, `useFileSystem`.
- Network: Opt-in and user-initiated. Calls the app's `/api/github/auth/*` (OAuth) and `/api/github/repos*` routes, which proxy the GitHub API. No telemetry.

## Quick Usage
```tsx
import GitHubVaultDialog from "./GitHubVaultDialog";

<GitHubVaultDialog /> // open via atom_githubVaultDialogOpen
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
