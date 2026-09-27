# VoicePreviewPanel

Description: Draggable panel showing dictated text (final and interim) with editing, voice-command help, and commit or discard.

## Local State & Storage
- State: Drag position, typewriter display text, and command-help toggle (useState/useRef), `useIsMobileChrome`, `useKeyboardInset`.
- Persistence: `localStorage["hermes_voice_panel_pos"]` (panel position).

## Dependencies
- Core: `Portal`, `Button`, `constants` (`SHORTCODES`), `voice-command-parser`.
- Zero-Cloud: No network itself. Speech recognition runs in `use-voice-input`/`use-global-voice-input` through the browser's Web Speech API, and some browsers process that audio on their own servers.

## Quick Usage
```tsx
import VoicePreviewPanel from "./VoicePreviewPanel";

<VoicePreviewPanel isListening previewText={text} onPreviewTextChange={setText} interimText={interim}
  onCommit={commit} onDiscard={discard} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isListening | `boolean` |  | Mic state |
| previewText | `string` |  | Committed transcript |
| onPreviewTextChange | `(text: string) => void` |  | Edit handler |
| interimText | `string \| null` |  | Live partial result |
| onCommit / onDiscard | `() => void` |  | Insert or drop the transcript |
