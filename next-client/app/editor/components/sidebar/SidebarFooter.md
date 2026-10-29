# SidebarFooter

Description: The sidebar's foot, pinned below the scrolling library (Pinned, Files), only holds a full-width, VS Code-style Git status bar. Settings lives in the header, and the Documentation icon is beside the editor's search control. For disk vaults with Git, the 44px-high status bar shows a delayed placeholder while `useVaultGitBranch` resolves, then the named local branch and a 44px copy button; clipboard failures show an error toast. Detached, unborn, and unsupported repositories omit the bar.

- Props: none.
- State: none.
- Core: `Button`, `useVaultGitBranch`, `atom_vaultDescriptor`, `atom_vaultHandle`, and `sidebar-classes.ts`.
