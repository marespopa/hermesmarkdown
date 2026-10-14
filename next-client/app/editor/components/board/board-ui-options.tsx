// Excalidraw props for a board, kept apart from BoardView. This file must not
// value-import Excalidraw (only BoardView.tsx may): `MainMenu` is passed in.
import type React from "react";

/** Hides load/save/export/theme actions and the image tool. */
export const BOARD_UI_OPTIONS = {
  canvasActions: {
    loadScene: false,
    saveToActiveFile: false,
    export: false,
    saveAsImage: false,
    toggleTheme: false,
  },
  tools: { image: false },
};

/** Excalidraw's onPaste: returning false stops it handling the paste. */
export function blockFilePaste(_data: unknown, event?: ClipboardEvent | null): boolean {
  const clipboard = event?.clipboardData;
  if (!clipboard) return true;
  if (clipboard.files && clipboard.files.length > 0) return false;
  return !Array.from(clipboard.items ?? []).some((item) => item.kind === "file" || item.type.startsWith("image/"));
}

/** Stops files (images, scenes) dropped onto the canvas. */
export function blockFileDrop(event: React.DragEvent) {
  if (Array.from(event.dataTransfer?.types ?? []).includes("Files")) {
    event.preventDefault();
    event.stopPropagation();
  }
}

/** The only menu entries kept: clear canvas and the background color. */
export function renderBoardMenu(MainMenu: any) {
  return (
    <MainMenu>
      <MainMenu.DefaultItems.ClearCanvas />
      <MainMenu.DefaultItems.ChangeCanvasBackground />
    </MainMenu>
  );
}
