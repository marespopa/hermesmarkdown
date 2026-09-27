# MentionMenu

Description: The @mention dropdown floating above the AI Chat input — whole-vault index, folder indexes, then single notes. Rows select on mousedown so the textarea keeps focus.

## Local State & Storage
- State: None; options and the active index come from `useChatMentions`.
- Persistence: None.

## Dependencies
- Core: `Button`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<MentionMenu options={options} activeIndex={index} query={query} onSelect={selectMention} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| options | `MentionOption[]` | | Rows to show |
| activeIndex | `number` | | Keyboard-highlighted row |
| query | `string` | | Current `@query` text |
| onSelect | `(option) => void` | | Called on row mousedown |
