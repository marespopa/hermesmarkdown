# FoldChevrons

Description: Collapse/expand chevrons drawn at the right edge of foldable callouts (`> [!note]-`), and a collapse chevron ("Collapse properties") at the right edge of expanded frontmatter, which collapses it in that note only. Collapsed frontmatter is its own summary row in the text (`CollapsedFrontmatterWidget` in `codemirror/frontmatter-fold.ts`), which expands it, so it gets no expand control here.

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
