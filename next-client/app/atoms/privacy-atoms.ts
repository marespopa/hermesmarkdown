import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { atom_fileMetadata } from "./metadata";
import {
  buildNoteDisplayItems,
  normalizePrivacyLevel,
  type NoteDisplayItem,
  type PrivacyLevel,
} from "@/app/utils/note-display";

// Privacy Mode: how private notes appear in listings. Read on init, so a
// reload in "hidden" never flashes private titles with the default level
// for a frame (that would show up in a screen share).
export const atom_privacyLevel = atomWithStorage<PrivacyLevel>(
  "hermes_privacy_mode",
  "show_title",
  undefined,
  { getOnInit: true },
);

// Session-only editor reveal (never persisted, resets on reload). It only
// affects the editor veil; listings follow atom_privacyLevel alone.
export const atom_revealAllPrivate = atom(false);
export const atom_revealedPrivatePaths = atom<ReadonlySet<string>>(new Set<string>());

export const atom_revealPrivatePath = atom(null, (get, set, path: string) => {
  const prev = get(atom_revealedPrivatePaths);
  if (prev.has(path)) return;
  const next = new Set(prev);
  next.add(path);
  set(atom_revealedPrivatePaths, next);
});

// Every note's display item for the current privacy level, keyed by path.
// Notes the level excludes are absent from the map.
export const atom_noteDisplayItems = atom<Map<string, NoteDisplayItem>>((get) =>
  buildNoteDisplayItems(get(atom_fileMetadata), normalizePrivacyLevel(get(atom_privacyLevel))),
);
