# CompanionHeader

Description: The companion's title bar (`PANE_HEADER_HEIGHT`, level with the pages' and the sidebar's): "AI Companion", the model (`useChatModels`, shared with Settings) as a quiet button with a chevron that opens the app's pop-up menu (`TabContextMenu`, the picked model checked; Escape closes only the menu), New chat (disabled with an empty thread) and Close.

## Props
| Prop | Type | Description |
|---|---|---|
| open | `boolean` | Loads the model list on first open |
| onNewChat / onClose | `() => void` | Clear the thread / hide the panel |
| canStartOver | `boolean` | Enables New chat |
