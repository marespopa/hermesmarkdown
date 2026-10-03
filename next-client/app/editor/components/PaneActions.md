# PaneActions

Description: One pane's own toolbar section, a borderless capsule on a subtle translucent fill (`PANE_SECTION_CLASS`): **Save** (`SaveStateIcon` — save glyph, with a badge while unsaved, a check when just saved, an exclamation mark on error; the tooltip shows the save error when there is one) and, while the window is split, **Close Pane**. Both are `PaneToolbarButton`s. `PaneLeaf` renders it in every pane, focused or not, so the toolbar never reflows when focus moves. Copy Markdown and Split Right live in the toolbar's More menu (`PaneWindowActions`) and act on the focused pane.

## Local State & Storage
- State: None; everything comes in through props.
- Persistence: None.

## Dependencies
- Core: `PaneToolbarButton`, `PaneTab` (`SaveStateIcon`, `statusMeta`), `pane-header-classes.ts`, `react-icons/hi`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<PaneActions
  hasFiles
  saveState="dirty"
  showClose={!isOnlyPane}
  onSave={handleSave}
  onClosePane={() => closePane(leaf.id)}
/>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| hasFiles | `boolean` |  | Disables Save in an empty pane |
| saveState | `TabSaveState` |  | Active file's save state |
| saveErrorMessage? | `string` |  | Shown in the Save tooltip on error |
| showClose | `boolean` |  | Close Pane, only while split |
| onSave / onClosePane | `() => void` |  | Actions |
