// Where each recent note was left: its selection and scroll position, by
// path, so coming back to it (another note in between, or a reload) shows
// the same place. Kept in localStorage["noteViewStates"] beside the open
// notes' names (open-notes-persister.ts); small, written after a pause and
// at once when the page is hidden. Only the most recent notes are kept.

export interface NoteViewState {
  anchor: number;
  head: number;
  /** The line block at the top of the scroller, and how far above it the scroller's top was (px). */
  scrollPos: number;
  scrollOffset: number;
}

const KEY = "noteViewStates";
export const MAX_NOTE_VIEW_STATES = 50;
const WRITE_DELAY_MS = 500;

let states: Map<string, NoteViewState> | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

function load(): Map<string, NoteViewState> {
  if (states) return states;
  states = new Map();
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    const parsed = raw ? (JSON.parse(raw) as [string, NoteViewState][]) : [];
    if (Array.isArray(parsed)) for (const [path, state] of parsed) states.set(path, state);
  } catch {
    // Unreadable: start empty.
  }
  return states;
}

function write() {
  clearTimeout(timer);
  timer = undefined;
  if (!states) return;
  try {
    localStorage.setItem(KEY, JSON.stringify([...states]));
  } catch {
    // Full or blocked: the places are a convenience, kept in memory.
  }
}

export function getNoteViewState(path: string): NoteViewState | null {
  return load().get(path) ?? null;
}

export function setNoteViewState(path: string, state: NoteViewState): void {
  const map = load();
  const previous = map.get(path);
  if (previous && previous.anchor === state.anchor && previous.head === state.head && previous.scrollPos === state.scrollPos && previous.scrollOffset === state.scrollOffset) return;
  // Most recent last; the oldest go first.
  map.delete(path);
  map.set(path, state);
  for (const key of map.keys()) {
    if (map.size <= MAX_NOTE_VIEW_STATES) break;
    map.delete(key);
  }
  clearTimeout(timer);
  timer = setTimeout(write, WRITE_DELAY_MS);
}

/** Follows a renamed or moved note. */
export function moveNoteViewState(from: string, to: string): void {
  const map = load();
  const state = map.get(from);
  if (!state) return;
  map.delete(from);
  map.set(to, state);
  clearTimeout(timer);
  timer = setTimeout(write, WRITE_DELAY_MS);
}

/** Tests: forget the in-memory copy. */
export function resetNoteViewStates(): void {
  clearTimeout(timer);
  states = null;
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", write);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && timer !== undefined) write();
  });
}
