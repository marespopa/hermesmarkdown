# SwitchVaultCommands

Registers **Switch Vault…** (`switch-vault`, Vault) in the command palette: a menu with one command per pinned vault (`switch-vault:<key>`), run through `useRecentVaults().openRecentVault`, which handles permission prompts, browser vs local vaults and failure toasts. It renders nothing unless two or more vaults are pinned; the open vault is listed, disabled with "Current vault". Mounted by `EditorShell`, so it is offered on every `/editor` route.
