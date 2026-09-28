# LoadingBar

Description: Slim indeterminate progress bar fixed to the top of the viewport, for short waits such as switching files. It fades in after 150ms, so fast operations show nothing, and it animates `transform` only, so it keeps moving while the main thread is rendering. With reduced motion it shows a static bar.

## Local State & Storage
- State: None; visibility is controlled by the parent (the editor passes `atom_isFileLoading`).
- Persistence: None - transient UI state.

## Dependencies
- Core: React; the `loading-bar-appear` / `loading-bar-slide` animations in `app/globals.scss`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import LoadingBar from "@/app/components/LoadingBar";

<LoadingBar isVisible={isFileLoading} label="Opening file" />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isVisible | `boolean` |  | Shows the bar |
| label? | `string` | `"Loading"` | Accessible name of the progress bar |
