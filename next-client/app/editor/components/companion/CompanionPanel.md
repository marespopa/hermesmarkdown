# CompanionPanel

Description: The AI companion's panel on the window's trailing edge, mirroring `WorkspaceSidebar` on the leading one. `EditorShell` mounts it once AI is set up, in a zero-width wrapper, and gives its width to `--content-right`; the editor page, every `ShellPage`, the corner buttons and `RecoveryBanner` stop short of it. Hidden, it slides out by its own width and is `inert`; `EditorShell` shows a fixed chat toggle that opens it. On mobile (`sheet`) it is a full-height sheet over the page.

## Props
| Prop | Type | Default | Description |
|---|---|---|---|
| sheet | `boolean` | `false` | Full-height sheet (mobile) instead of a docked panel |

## Local State & Storage
- `atom_companionOpen`, `atom_companionWidth` (320–640, default 380; remembered), `atom_companionRequest` (the entry point's note and selection).
- The conversation is the session's Chat instance (`companion-chat-store.ts`), so closing or remounting the panel keeps it.

## Logic
- Escape that nothing inside handled collapses it; so does the header's collapse control or Ctrl/Cmd+J.
- The leading-edge handle resizes by drag or arrow keys (Shift: larger steps); double-click resets.
