# FrontmatterStatusMenu

Description: Dropdown of the known statuses — todo, in-progress, done, a divider, then draft, review, active, archived (`FRONTMATTER_STATUSES` in `constants.ts`) — with the current value checked. A current value outside the list is shown first, followed by a divider. Opened from the frontmatter header's status chip, or by Ctrl/Cmd+Shift+Enter on a `status:` line. Picking one rewrites only that value in the YAML as one undo step; Esc or a click outside changes nothing.

## Local State & Storage
- State: None here; the open menu lives in `use-frontmatter-header`.
- Persistence: None - transient UI state.

## Dependencies
- Core: `TabContextMenu` (portaled, viewport-clamped, arrow keys), `constants.ts`.
- Requests: `codemirror/frontmatter-header.ts` (`FRONTMATTER_CHIP_EVENT`, `setFrontmatterValue`).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<FrontmatterStatusMenu x={menu.x} y={menu.y} current={menu.current} onSelect={selectStatus} onClose={close} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| x, y | `number` | | Viewport point for the menu's top-left corner |
| current | `string` | | The note's current `status` value |
| onSelect | `(status: string) => void` | | Picked status |
| onClose | `() => void` | | Esc / click outside |
