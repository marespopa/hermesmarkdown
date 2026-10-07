# VimStatusPill

Description: Vim mode indicator for the editor, shown when Vim mode is on. A chrome pill (the same recipe as the feed's key hints and the palette's search pill) floats at the bottom right of the pane with a dot and the mode: Normal or Replace (clay dot), Visual / Visual line / Visual block (moss dot). Keys of an unfinished command (`d2`) follow as a keycap. It fades out in Insert mode. Typing `:`, `/` or `?` turns it into a wider, centred command line; Vim messages ("Not an editor command") show there too.

Replaces the library's status panel, a full-width strip under the text.

## Local State & Storage
- State: None. `useVimStatus` (`app/editor/hooks/use-vim-status.ts`) supplies `{ mode, prompting }` and the host ref.
- Persistence: None.

## Logic
- The Vim extension is created with `vim()` (no panel). `useVimStatus` points `cm.state.statusbar` at the pill's host element, so the library renders its prompt, messages and pending keys there. The host's contents belong to the library, not React. `app/editor/editor.scss` (`.vim-status-host`) hides the library's own `--NORMAL--` label and restyles its inline prompt styles.
- `useVimStatus` subscribes to the library's `vim-mode-change` and `dialog` events through `useSyncExternalStore`. `MarkdownEditor` calls it after `useCodeMirrorEditor` so the Vim compartment is live when it subscribes.
- The pill is hidden with opacity and `aria-hidden`, never `visibility: hidden`. The library focuses the prompt input synchronously, before React re-renders, so the input must already be focusable.

## Dependencies
- Core: `@replit/codemirror-vim` (through `useVimStatus`).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
const { hostRef, status } = useVimStatus(editorView, vimMode);
{vimMode && <VimStatusPill status={status} hostRef={hostRef} />}
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| status | `VimStatus` (`mode`, `prompting`) | | Current mode and whether a prompt/message is open |
| hostRef | `RefObject<HTMLDivElement \| null>` | | Element the Vim library renders its prompt and pending keys into |
