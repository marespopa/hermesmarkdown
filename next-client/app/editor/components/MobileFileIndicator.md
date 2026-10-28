# MobileFileIndicator

Description: Compact mobile header chip showing the active file name and its save state, with a menu button (opens the navigation drawer), save, command palette, AI chat and outline (opens the outline drawer) shortcuts. It stays on screen while you type.

## Local State & Storage
- State: `atom_workspaceLayout`, `atom_openFiles`, `atom_saveStatus`, `atom_vaultHandle`, `useCommandPalette`, `atom_mobileDrawerOpen`, `atom_mobileOutlineOpen`.
- Persistence: None itself. It reads `localStorage["workspaceLayout"]` and the open notes (`atom_openFiles`, IndexedDB with `localStorage["openNotes"]`) through the atoms.

## Dependencies
- Core: `save-state.tsx` (`statusMeta`, `SaveStateIcon`), `CommandPaletteContext`, `react-icons`.
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
