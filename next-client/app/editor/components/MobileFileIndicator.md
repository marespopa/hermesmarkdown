# MobileFileIndicator

Description: Compact mobile header chip showing the active file name and its save state, with home feed (vault only), save, the ⓘ metadata toggle (`FrontmatterToggle`, only when the file has frontmatter), an icon-only Edit / Preview switch (`PaneModeSwitch`), command palette, and AI chat shortcuts. Hidden while the home feed is showing.

## Local State & Storage
- State: `atom_workspaceLayout`, `atom_activePaneId`, `atom_openFiles`, `atom_saveStatus`, `atom_vaultHandle`, `atom_homeFeedOpen`, `useCommandPalette`.
- Persistence: None itself. It reads `localStorage["workspaceLayout"]` and `localStorage["openFiles"]` through the atoms.

## Dependencies
- Core: `PaneTab` (`statusMeta`), `PaneModeSwitch`, `FrontmatterToggle`, `CommandPaletteContext`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import MobileFileIndicator from "./components/MobileFileIndicator";

<MobileFileIndicator onSave={save} onOpenAIChat={openChat} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| onSave | `() => void` |  | Save the active file |
| onOpenAIChat? | `() => void` |  | Opens AI chat |
