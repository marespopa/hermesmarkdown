# FoldChevrons

Description: Collapse/expand chevrons drawn at the right edge of foldable callouts (`> [!note]-`). Frontmatter has no chevron here: it toggles from its own header row in the text (`FrontmatterHeaderWidget` in `codemirror/frontmatter-fold.ts`), in the same top-left spot whether collapsed or expanded.

## Local State & Storage
- State: None; chevron positions come from `useCodeMirrorCalloutFold`.
- Persistence: None.

## Dependencies
- Core: `Button`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<FoldChevrons chevrons={chevrons} onToggle={(chevron) => toggle(chevron)} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| chevrons | `FoldChevron[]` (`blockId`, `top`, `collapsed`) | | Chevrons to draw |
| onToggle | `(chevron) => void` | | Folds or unfolds that block |
