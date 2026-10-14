# BoardError

Description: Pane state for a board that can't be shown. No Excalidraw import. Never writes.

## Props
- `kind`: `"conflict"` shows "This board has unresolved merge conflicts" (a sync left conflict markers in the fence); `"invalid"` shows "This board couldn't be read" (bad JSON or an unsupported board version).
- `onEditAsMarkdown`: the **Edit as Markdown** button (`Button`, secondary); opens the raw file in the text editor so the user can repair it.

## Storage & Network
None.
