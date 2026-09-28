# RepurposeNoteWizard

Description: Three-step wizard (select, drafting, review) that turns the current note into a blog post, social post, or newsletter draft saved as a new vault file.

## Local State & Storage
- State: `atom_repurposeWizardOpen`, `atom_content`, `atom_fileName`. Phase, format, and draft are local useState.
- Persistence: The draft is saved as a new local file through `useFileSystem`.

## Dependencies
- Core: `DialogModal`, `Button`, `useFileSystem`, `app/services/ai` (`callAI`), `Toastr`.
- Network: Opt-in AI. Only on user action, it sends the prompt plus the selected or document text to the app's own `/api/ai` route (`app/services/ai.ts`), which forwards it to Anthropic or Gemini using the user's own API key. No telemetry.

## Quick Usage
```tsx
import RepurposeNoteWizard from "./RepurposeNoteWizard";

<RepurposeNoteWizard /> // open via atom_repurposeWizardOpen
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
