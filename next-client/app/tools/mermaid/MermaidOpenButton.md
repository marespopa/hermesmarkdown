# MermaidOpenButton

Description: `OpenInWorkspaceButton` for the Mermaid tool: hands over `# Mermaid diagram` and the fenced block (`mermaidHandoffMarkdown`), as a draft named "Mermaid diagram", at `/editor?from=mermaid`; the editor renders it inline. Disabled for an empty source or past the 200,000-character limit. Used in the tool and in the page's pitch block; both read `atom_mermaidToolSource`.

## Local State & Storage
- State: `atom_mermaidToolSource`. Persistence: none of its own.

## Quick Usage
```tsx
<MermaidOpenButton variant="outlined" />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| variant | `"primary" \| "outlined"` | `"primary"` | |
