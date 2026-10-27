# CompanionHeader

Description: The companion's title bar (`PANE_HEADER_HEIGHT`, level with the pages' and the sidebar's): "AI Companion", the model (`useChatModels`, shared with Settings) as a quiet button with a chevron that opens the app's pop-up menu (`TabContextMenu`, the picked model checked; Escape closes only the menu), Summarize chat (`HiOutlineDocumentText`, as `/compact`) and New chat (`HiOutlineChat`, as `/new`), both disabled with an empty thread (Summarize also while a turn runs), and Close.

## Props
| Prop | Type | Description |
|---|---|---|
| open | `boolean` | Loads the model list on first open |
| onNewChat / onCompact / onClose | `() => void` | Clear the thread / replace it with its summary / hide the panel |
| canStartOver | `boolean` | Enables New chat |
| canCompact | `boolean` | Enables Summarize chat |
