# WorkspaceSplitter

Description: Recursively renders the workspace layout tree as resizable panel groups, with a `PaneLeaf` at each leaf.

## Local State & Storage
- State: None. The tree comes from props, originally `atom_workspaceLayout`.
- Persistence: None itself. The layout lives in `localStorage["workspaceLayout"]`.

## Dependencies
- Core: `react-resizable-panels`, `PaneLeaf`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import WorkspaceSplitter from "./WorkspaceSplitter";

<WorkspaceSplitter node={layout.rootContainer} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| node | `WorkspaceContainer \| PanelLeaf` |  | Layout subtree |

## Splits (SplitGroup)
- A container renders as `SplitGroup` (a component of its own, since it runs hooks). Panels get `id={child.id}`, a **string** percentage `defaultSize` (`"70%"`: a bare number means pixels in react-resizable-panels v4) and `minSize="10%"`.
- `Group.onLayoutChanged` fires when a divider drag ends and writes the percentages back with `atom_setSplitSizes`, so sizes persist (`workspaceLayout`) and restore on reload. Unchanged sizes are not written.
- Scroll lock: when the split has `scrollLock` and exactly two leaf children, `useScrollLock` (hooks/use-scroll-lock.ts) links the two panes' wrapper divs.
- The `Separator` has no children on purpose: v4 hit-tests separator presses in the capture phase on the group, so a button inside would never get a click. The lock toggle lives in the pane titles.
