# MobileSelectionToolbar

Description: Mobile-only floating Bold/Italic/Link toolbar above a text selection. It dismisses itself when the selection collapses.

## Local State & Storage
- State: Toolbar position (useState), driven by `selectionchange` on `.editor-container textarea`.
- Persistence: None - transient UI state.

## Dependencies
- Core: `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import MobileSelectionToolbar from "./components/MobileSelectionToolbar";

<MobileSelectionToolbar />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
