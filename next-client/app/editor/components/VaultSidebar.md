# VaultSidebar

`VaultSidebar` is HermesMarkdown's on-demand, local-first navigation drawer. On desktop it overlays the editor rather than reserving space, so writing remains the default experience. Tags, views, search, folders, and other commands stay in the command palette instead of permanently occupying the drawer.

## Layout

- **Header**: active vault switcher and drawer collapse control.
- **Recents**: up to three recently opened notes for immediate context switching.
- **Explorer**: the Markdown file/folder hierarchy, with extensionless note labels, a command-palette action, and hover-only row actions.
- **Footer**: a pinned 32px opaque utility bar showing note and folder totals, with compact New Note, New Folder, Reveal Vault, and Settings controls. It intentionally omits save/sync status and version information.

The command palette is the primary keyboard navigation surface: `Ctrl/Cmd+K` or `Ctrl/Cmd+P` opens quick switching, while `Ctrl/Cmd+Shift+K` and `Ctrl/Cmd+Shift+P` open command mode with `>` prefilled.

## Behavior and safety

- The drawer opens with `Ctrl/Cmd+B`, its compact edge control, or a desktop left-edge dwell; it never reflows the editor.
- New Note prompts for a destination folder, then a file name before creating the Markdown file.
- Tree rows resolve fresh file-system handles before rename/move operations. Inline rename selects the basename of Markdown files, leaving `.md` intact.
- Folder drag hover expands a valid collapsed target after 400ms. Drag timers are cleared on leave, drop, and unmount.
- Vault access uses the browser File System Access API, so notes remain plain files in the user-selected folder.
