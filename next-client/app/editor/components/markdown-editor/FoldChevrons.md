# FoldChevrons

Description: Collapse/expand chevrons drawn at the right edge of foldable callouts (`> [!note]-`) and raw HTML `<details>` sections (`kind: "details"`, labelled "Expand/Collapse section"; callouts keep "… callout"). Headings have no chevron here: theirs hang in the leading margin, drawn by CodeMirror (`codemirror/heading-fold.ts`).

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
| chevrons | `FoldChevron[]` (`blockId`, `top`, `collapsed`, `kind?`) | | Chevrons to draw |
| onToggle | `(chevron) => void` | | Folds or unfolds that block |
