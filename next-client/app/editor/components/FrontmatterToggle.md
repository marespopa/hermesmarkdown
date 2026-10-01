# FrontmatterToggle

Description: The ⓘ metadata button. Shows or hides frontmatter in every file (`codemirror/frontmatter-fold.ts`): it flips the app-wide *Collapse Frontmatter* setting (`atom_frontmatterCollapsedByDefault`), which every open editor follows live and newly opened or created files start with. Collapsed frontmatter is a zero-height hidden block, so the document's first content line is its first visible row; this button is the way back in. `PaneWindowActions` shows it in the top-right pane's header, next to the Edit | Preview switch; `MobileFileIndicator` shows it in the mobile bar. Hidden when the active file has no frontmatter. Outline icon while collapsed, filled while shown.

## Local State & Storage
- State: `atom_frontmatterCollapsedByDefault` (read/write) and `atom_activeFileHasFrontmatter` (read; `MarkdownEditor` writes it while its pane is active).
- Persistence: `localStorage["frontmatterCollapsedByDefault"]`, the same setting as *Settings → Collapse Frontmatter*.

## Dependencies
- Core: `Button`, `Tooltip`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import FrontmatterToggle from "./FrontmatterToggle";

<FrontmatterToggle className={PANE_ACTION_BUTTON_CLASS} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| className? | `string` | — | Button classes |
| size? | `number` | `17` | Icon size |
| withTooltip? | `boolean` | `true` | Hover tooltip (off on touch, where it falls back to `title`) |
