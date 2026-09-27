# DialogModal

Description: Modal dialog shell (built on `OverlayPanel`), plus `GlobalDialog`, the app-wide alert/confirm/prompt/select/new-file dialog driven by an atom.

## Local State & Storage
- State: `DialogModal` is controlled. `GlobalDialog` reads `atom_globalDialog` (ui-atoms) and `atom_fileMetadata` (for tag suggestions), and holds its input in local useState.
- Persistence: None - transient UI state.

## Dependencies
- Core: `OverlayPanel`, `Button`, `Input`, `Typeahead`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import DialogModal from "@/app/components/DialogModal/DialogModal";

<DialogModal isOpened={open} onClose={close} onConfirm={save} mobileSheet>
  {body}
</DialogModal>
```
To open `GlobalDialog`, set `atom_globalDialog` to a `DialogConfig` (`type`, `message`, `resolve`, …). It resolves with the user's value.

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isOpened | `boolean` |  | Visibility |
| onClose | `() => void` |  | Dismiss handler |
| onConfirm? | `() => void` |  | Enter-to-confirm handler |
| children | `ReactNode` |  | Dialog body |
| styles? | `string` | `""` | Panel classes |
| hideCloseButton? | `boolean` | `false` | Hides the X button |
| mobileSheet? | `boolean` | `false` | Bottom-sheet layout on mobile (keeps it clear of the keyboard) |
| ariaLabelledBy? / ariaDescribedBy? | `string` |  | ARIA ids |
