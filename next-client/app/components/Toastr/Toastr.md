# Toastr

Description: Styled `react-hot-toast` helpers for transient success, error, copy, save-state and action (message plus one button) notifications.

## Local State & Storage
- State: The `react-hot-toast` queue, rendered by `<Toaster>` in `MainPage`.
- Persistence: None - transient UI state.

## Dependencies
- Core: `react-hot-toast`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";

showErrorToast("Could not save file");
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| showSuccessToast / showErrorToast / showCopyToast | `(message: string) => void` |  | Error toasts last 4s, copy toasts 2s |
| showActionToast | `(message: string, actionLabel: string, onAction: () => void) => void` |  | Success toast (5s) with one tertiary `Button`; clicking it dismisses the toast, then runs `onAction`. Nothing takes focus. Used by Quick jot ("Added to 2026-10-10 · Open") |
| showSaveStateToast (default) | `(status: "saved" \| "error") => void` |  | Save feedback |
