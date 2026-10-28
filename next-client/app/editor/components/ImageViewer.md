# ImageViewer

Description: What a pane shows for an opened image file (PNG, JPEG, GIF, WebP, AVIF, BMP, ICO, SVG; `isImagePath`): the picture fitted in the pane. It is read-only; images are never read as text, indexed or saved.

## Local State & Storage
- State: `atom_vaultHandle`; the last resolved `{ path, url }`.
- Persistence: None. The blob URL comes from `imageUrlFor` (`editor/utils/embed-files.ts`), cached by modified time.

## Dependencies
- Core: `imageUrlFor` (an SVG goes through `sanitizeSvg` first, see `plans/image-rendering.md`), `resolveFileHandleAtPath`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<ImageViewer path="assets/diagram.svg" />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| `path` | `string` | — | Vault path of the image. |

## Logic
- Shows a screen-reader-only "Opening…" status until the file is read, and "This image can't be shown." when it is missing or an SVG fails sanitising.
- Renders an `<img>` only, never inline SVG, so the browser sandboxes it.
