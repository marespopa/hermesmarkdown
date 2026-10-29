# CompanionHeader

Description: The companion's title bar (`PANE_HEADER_HEIGHT`, level with the pages' and the sidebar's): "AI Companion", the selected model (`useChatModels`, shared with Settings) as the same compact text button as trunk. Clicking it swaps the button for a typeahead in the same position; it filters names as the user types, and lists **Auto** first so a long provider model list never becomes an oversized menu. Its only other action is `VscLayoutSidebarRight`, which collapses the trailing panel; its collapsed-state chat toggle is in `EditorShell`. Summarizing is a command (`/compact` or `/summarize`), listed by the composer's `/` menu.

## Props
| Prop | Type | Description |
|---|---|---|
| open | `boolean` | Loads the model list on first open |
| onClose | `() => void` | Hides the panel |
