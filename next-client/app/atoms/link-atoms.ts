import { atom } from "jotai";
import { atom_fileMetadata } from "./metadata";
import { buildBacklinkIndex } from "@/app/utils/note-links/backlinks";

// target path → paths of the notes linking to it (wikilinks and embeds).
// Derived from the indexed links, so it follows edits and renames; computed
// only while something (the Linked from section) reads it.
export const atom_backlinkIndex = atom((get) => buildBacklinkIndex(get(atom_fileMetadata)));
