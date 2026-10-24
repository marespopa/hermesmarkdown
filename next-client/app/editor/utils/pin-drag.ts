// The drag payload that pins: the Files tree puts the notes and
// folders it drags on it, and the sidebar's Pinned section takes it
// (SidebarPinned). Only notes (`.md`) and folders are pinnable.
export const PIN_DRAG_TYPE = "application/x-hermes-pinnable";

export type PinDragTarget = { kind: "note" | "folder"; target: string };

type DraggedEntry = { kind: "file" | "folder"; path: string };

// The pinnable ones among dragged entries.
export function pinTargetsOf(entries: DraggedEntry[]): PinDragTarget[] {
  return entries.flatMap(({ kind, path }): PinDragTarget[] => {
    if (kind === "folder") return path ? [{ kind: "folder", target: path }] : [];
    return /\.md$/i.test(path) ? [{ kind: "note", target: path }] : [];
  });
}

// Adds the pinnable entries to a drag. With none, the drag carries no payload.
export function setPinDragData(dataTransfer: DataTransfer, entries: DraggedEntry[]): void {
  const targets = pinTargetsOf(entries);
  if (targets.length) dataTransfer.setData(PIN_DRAG_TYPE, JSON.stringify(targets));
}

// Touch screens: the Files tree drags with its own long press, not the
// browser's drag and drop (use-touch-tree-drag.ts), so it tells the Pinned
// section through this document event instead: "start" once picked up,
// "move" with the finger, "end" when lifted (`dropped`) or cancelled.
export const PIN_TOUCH_DRAG_EVENT = "hermes:pin-touch-drag";

export type PinTouchDrag = { phase: "start" | "move" | "end"; x: number; y: number; targets: PinDragTarget[]; dropped?: boolean };

export function announcePinTouchDrag(detail: PinTouchDrag): void {
  document.dispatchEvent(new CustomEvent<PinTouchDrag>(PIN_TOUCH_DRAG_EVENT, { detail }));
}

// While dragging only the type is readable, so this is all a drag-over knows.
export const carriesPinTargets = (dataTransfer: DataTransfer | null): boolean =>
  !!dataTransfer && Array.from(dataTransfer.types).includes(PIN_DRAG_TYPE);

// The targets, on drop (tolerant: anything malformed is left out).
export function readPinDragData(dataTransfer: DataTransfer): PinDragTarget[] {
  try {
    const parsed: unknown = JSON.parse(dataTransfer.getData(PIN_DRAG_TYPE) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PinDragTarget =>
        !!item && (item.kind === "note" || item.kind === "folder") && typeof item.target === "string" && item.target !== "",
    );
  } catch {
    return [];
  }
}
