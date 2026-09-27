# ImageDialog

Description: Lightbox for images in a note. It resolves relative paths to vault files and shows them as blob URLs.

## Local State & Storage
- State: `atom_vaultHandle`, `atom_currentDirectoryHandle`. The source, name, loading, and error are local useState, and the blob URL is revoked on close.
- Persistence: None - transient UI state.
- Opened by `document.dispatchEvent(new CustomEvent("hermes:open-image-dialog", { detail: { src, alt? } }))`.

## Dependencies
- Core: `DialogModal`, `app/utils/resolve-vault-file`.
- Zero-Cloud: No API or telemetry calls. Vault images are read locally. An absolute `http(s):` source is loaded by the browser from that URL.

## Quick Usage
```tsx
import ImageDialog from "./components/ImageDialog";

<ImageDialog /> // mount once; open via the custom event
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
