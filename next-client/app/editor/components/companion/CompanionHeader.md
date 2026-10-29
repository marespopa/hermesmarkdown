# CompanionHeader

Description: The companion's title bar (`PANE_HEADER_HEIGHT`, level with the pages' and the sidebar's): "AI Companion", the model (`useChatModels`, shared with Settings) as a compact typeahead. It shows the selected model as its placeholder, filters names as the user types, and lists **Auto** first. The picker renders at most 50 matches, so large provider model lists remain responsive. New chat (`HiOutlinePencilAlt`, the compose icon, as `/new`; disabled with an empty thread) and Close follow. Summarizing has no button: it is `/compact` (or `/summarize`), listed by the composer's `/` menu.

## Props
| Prop | Type | Description |
|---|---|---|
| open | `boolean` | Loads the model list on first open |
| onNewChat / onClose | `() => void` | Clear the thread / hide the panel |
| canStartOver | `boolean` | Enables New chat |
