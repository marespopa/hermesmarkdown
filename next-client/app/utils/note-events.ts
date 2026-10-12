// A document event fired after a note is written to disk (saveFile), so
// views built from other notes can follow along (a rollup sheet refreshes
// when one of its daily sheets is saved).

export const NOTE_SAVED_EVENT = "hermes:note-saved";

export function announceNoteSaved(path: string) {
  document.dispatchEvent(new CustomEvent<{ path: string }>(NOTE_SAVED_EVENT, { detail: { path } }));
}
