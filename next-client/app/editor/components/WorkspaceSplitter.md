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
