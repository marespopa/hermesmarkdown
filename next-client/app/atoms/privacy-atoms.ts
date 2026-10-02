import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { atom_fileMetadata } from "./metadata";
import {
  buildNoteDisplayItems,
  normalizePrivacyLevel,
  type NoteDisplayItem,
  type PrivacyLevel,
} from "@/app/utils/note-display";

// Privacy Mode: how sensitive notes appear in listings. Read on init, so a
// reload in "hidden" never flashes sensitive titles with the default level
// for a frame (that would show up in a screen share).
export const atom_privacyLevel = atomWithStorage<PrivacyLevel>(
  "hermes_privacy_mode",
  "show_title",
  undefined,
  { getOnInit: true },
);

// Session-only editor reveal (never persisted, resets on reload). It only
// affects the editor veil; listings follow atom_privacyLevel alone.
export const atom_revealAllSensitive = atom(false);
export const atom_revealedSensitivePaths = atom<ReadonlySet<string>>(new Set<string>());

export const atom_revealSensitivePath = atom(null, (get, set, path: string) => {
  const prev = get(atom_revealedSensitivePaths);
  if (prev.has(path)) return;
  const next = new Set(prev);
  next.add(path);
  set(atom_revealedSensitivePaths, next);
});

// Every note's display item for the current privacy level, keyed by path.
// Notes the level excludes are absent from the map.
export const atom_noteDisplayItems = atom<Map<string, NoteDisplayItem>>((get) =>
  buildNoteDisplayItems(get(atom_fileMetadata), normalizePrivacyLevel(get(atom_privacyLevel))),
);
