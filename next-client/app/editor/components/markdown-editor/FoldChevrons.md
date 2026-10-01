# FoldChevrons

Description: Collapse/expand chevrons drawn at the right edge of foldable callouts (`> [!note]-`), and a close (×, "Hide metadata") at the right edge of expanded frontmatter, which hides metadata app-wide like the header's ⓘ. Collapsed frontmatter is hidden outright and is shown again from the header's `FrontmatterToggle`, so it gets no expand control here.

## Local State & Storage
- State: None; chevron positions come from `useCodeMirrorCalloutFold` / `useCodeMirrorFrontmatterFold`.
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
| chevrons | `FoldChevron[]` (`blockId`, `top`, `collapsed`, `kind`) | | Chevrons to draw |
| onToggle | `(chevron) => void` | | Folds or unfolds that block |
