import { atom } from "jotai";
import { continueExternalReview, type ExternalReview } from "@/app/editor/utils/external-review";
import { isPrivateContent } from "@/app/utils/note-privacy";

// Notes changed from outside the editor that have not been reviewed yet, by
// path (editor/components/markdown-editor/ExternalChangeReview.tsx). Session
// only: the text on disk is already what the note shows.
export const atom_externalReviews = atom<Record<string, ExternalReview>>({});

function withReview(all: Record<string, ExternalReview>, path: string, review: ExternalReview | null) {
  const next = { ...all };
  if (review) next[path] = review;
  else delete next[path];
  return next;
}

// A note's text was replaced by what is on disk. Private notes are never
// compared or kept, so their earlier text isn't held in a second place.
export const atom_recordExternalChange = atom(
  null,
  (get, set, change: { path: string; before: string; after: string }) => {
    const { path, before, after } = change;
    const all = get(atom_externalReviews);
    const next = isPrivateContent(before) || isPrivateContent(after)
      ? null
      : continueExternalReview(all[path], path, before, after);
    if (!next && !all[path]) return;
    set(atom_externalReviews, withReview(all, path, next));
  },
);

// Sets a note's review (after some changes are decided) or, with null, ends it.
export const atom_setExternalReview = atom(
  null,
  (get, set, update: { path: string; review: ExternalReview | null }) => {
    set(atom_externalReviews, withReview(get(atom_externalReviews), update.path, update.review));
  },
);
