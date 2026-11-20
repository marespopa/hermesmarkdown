# LandingFeature

Description: One chapter of the home page. On one side: an eyebrow, the headline (an `h2`) and one sentence. On the other: the chapter's demo. The sides swap on every other chapter. On a phone the chapter is stacked with the demo first. It enters once via [Reveal](Reveal.md). The chapters come from `LANDING_FEATURES` and `LANDING_FILES` in `landing-content.ts`, and the demo is picked by its `demo` key (`palette`, `table`, `render`, `focus`, `files`). The looping demos load with `next/dynamic` in their own chunks. The server still renders their still frame, and the box is reserved, so nothing shifts.

## Local State & Storage
- State: none. Persistence: none.

## Dependencies
- Core: [DemoPalette](DemoPalette.md), [DemoTable](DemoTable.md), [DemoRender](DemoRender.md), [DemoFocus](DemoFocus.md), [DemoFiles](DemoFiles.md), [Reveal](Reveal.md), `landing-styles.ts`.
- Zero-Cloud: no network requests.

## Quick Usage
```tsx
{LANDING_FEATURES.map((feature, index) => <LandingFeature key={feature.id} feature={feature} index={index} />)}
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| feature | `LandingFeature` |  | `{ id, eyebrow, title, body, demo }` |
| index | `number` |  | Position, for alternating sides |
