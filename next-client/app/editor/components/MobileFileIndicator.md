# MobileFileIndicator

Description: Compact mobile header chip showing the active file name and its save state, with home feed (vault only), save, command palette, and AI chat shortcuts. Hidden while the home feed is showing. Carries `.typing-chrome`: it fades while you type and returns on a tap outside the text (`useFadeChromeWhileTyping`).

## Local State & Storage
- State: `atom_workspaceLayout`, `atom_activePaneId`, `atom_openFiles`, `atom_saveStatus`, `atom_vaultHandle`, `atom_homeFeedOpen`, `useCommandPalette`.
- Persistence: None itself. It reads `localStorage["workspaceLayout"]` and `localStorage["openFiles"]` through the atoms.

## Dependencies
- Core: `PaneTab` (`statusMeta`), `CommandPaletteContext`, `react-icons`.
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
