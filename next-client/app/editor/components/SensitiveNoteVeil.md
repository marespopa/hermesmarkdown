# SensitiveNoteVeil

Description: The centered `bg-surface` panel shown in place of the editor for a sensitive note: a lock with "Sensitive note", the note's title, a **Show note** button (`secondary`) and **Show all sensitive notes this session** (`tertiary`). It never renders the note's text.

## Local State & Storage
- State: None (controlled by `SensitiveNoteGate`).
- Persistence: None.

## Logic
- "Show note" is focused (without scrolling) when the pane is active, so Enter reveals it.
- Buttons use the 44px mobile row height (`min-h-11`).

## Dependencies
- Core: `Button`, `SensitiveBadge`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<SensitiveNoteVeil title="Payroll" isActivePane onShowNote={reveal} onShowAll={revealAll} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| title | `string` |  | Display title (never body text) |
| isActivePane | `boolean` |  | Focus "Show note" when true |
| onShowNote | `() => void` |  | Reveal this note for the session |
| onShowAll | `() => void` |  | Reveal every sensitive note for the session |
