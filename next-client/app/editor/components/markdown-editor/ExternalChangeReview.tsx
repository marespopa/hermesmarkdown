"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { EditorView } from "@codemirror/view";
import { IoClose } from "react-icons/io5";
import { atom_externalReviews, atom_setExternalReview } from "@/app/atoms/external-review-atoms";
import Button from "@/app/components/Button";
import {
  locateChange,
  undoEdit,
  withoutChanges,
  type ExternalChange,
} from "@/app/editor/utils/external-review";

interface Located {
  change: ExternalChange;
  at: number;
}

const plural = (count: number) => `${count} change${count === 1 ? "" : "s"}`;

// What changed in a note from outside the editor (an AI tool, a Git pull, a
// synced folder), as a quiet pill at the pane's bottom edge that opens into
// one card per change, under its heading. The note already shows the new
// text; Keep just closes a card, Undo puts the old text back as an ordinary
// edit (⌘Z takes that back too).
export default function ExternalChangeReview({
  view,
  filePath,
  text,
}: {
  view: EditorView | null;
  filePath: string;
  text: string;
}) {
  const review = useAtomValue(atom_externalReviews)[filePath];
  const setReview = useSetAtom(atom_setExternalReview);
  const [open, setOpen] = useState(false);

  // A change the note's own edits have since moved or removed is left out.
  const located = useMemo<Located[]>(
    () => (review?.changes ?? []).flatMap((change) => {
      const at = locateChange(text, change);
      return at === null ? [] : [{ change, at }];
    }),
    [review, text],
  );

  const finished = !!review && located.length === 0;
  useEffect(() => {
    if (finished) setReview({ path: filePath, review: null });
  }, [finished, filePath, setReview]);

  if (!review || located.length === 0) return null;

  const keep = (items: Located[]) =>
    setReview({ path: filePath, review: withoutChanges(review, new Set(items.map((item) => item.change.id))) });

  const undo = (items: Located[]) => {
    if (!view) return;
    const edits = items.map(({ change, at }) => undoEdit(change, at));
    // The cards answer at once; the edit lands in the same frame.
    setReview({
      path: filePath,
      review: withoutChanges(
        review,
        new Set(items.map((item) => item.change.id)),
        items.map(({ change, at }) => ({ at, delta: change.removed.length - change.added.length })),
      ),
    });
    view.dispatch({
      changes: edits,
      selection: { anchor: edits[0].from + edits[0].insert.length },
      scrollIntoView: true,
      userEvent: "input.external-undo",
    });
  };

  const show = ({ at }: Located) => {
    if (!view) return;
    view.dispatch({ selection: { anchor: at }, effects: EditorView.scrollIntoView(at, { y: "center" }) });
    view.focus();
  };

  return (
    <div className="pointer-events-none sticky bottom-0 z-20 h-0">
      <div className="absolute bottom-4 left-1/2 flex w-[min(34rem,calc(100%-2rem))] -translate-x-1/2 justify-center">
        {open ? (
          <section aria-label="Changes made outside the editor" className="glass-panel pointer-events-auto w-full rounded-xl p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-ui-footnote font-semibold text-fg">
                Changed outside the editor <span className="font-normal text-fg-faint">· {plural(located.length)}</span>
              </p>
              <Button variant="close" aria-label="Hide changes" onClick={() => setOpen(false)}>
                <IoClose size={18} aria-hidden="true" />
              </Button>
            </div>
            <ul className="max-h-[50vh] space-y-2 overflow-auto">
              {located.map((item) => (
                <ChangeCard key={item.change.id} item={item} onShow={() => show(item)} onKeep={() => keep([item])} onUndo={() => undo([item])} />
              ))}
            </ul>
            {located.length > 1 && (
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="secondary" className="!h-9 !px-3" onClick={() => undo(located)}>Undo all</Button>
                <Button variant="primary" className="!h-9 !px-3" onClick={() => keep(located)}>Keep all</Button>
              </div>
            )}
          </section>
        ) : (
          <Button
            variant="unstyled"
            className="glass-panel pointer-events-auto h-9 rounded-full px-4 text-ui-footnote text-fg"
            onClick={() => setOpen(true)}
          >
            Changed outside the editor · {plural(located.length)}
          </Button>
        )}
      </div>
    </div>
  );
}

const lines = (text: string) => text.replace(/\n$/, "").split("\n");

function ChangeCard({ item, onShow, onKeep, onUndo }: { item: Located; onShow: () => void; onKeep: () => void; onUndo: () => void }) {
  const { change } = item;
  return (
    <li className="rounded-lg bg-fill px-3 py-2">
      <Button variant="bare" className="mb-1 max-w-full truncate text-fg-muted" onClick={onShow}>
        {change.heading ? `Under ${change.heading}` : "Top of note"}
      </Button>
      {change.removed && (
        <pre aria-label="Removed" className="max-h-24 overflow-auto whitespace-pre-wrap break-words font-mono text-ui-caption text-fg-faint line-through">
          {lines(change.removed).join("\n")}
        </pre>
      )}
      {change.added && (
        <pre aria-label="Added" className="max-h-24 overflow-auto whitespace-pre-wrap break-words font-mono text-ui-caption text-fg">
          {lines(change.added).join("\n")}
        </pre>
      )}
      <div className="mt-2 flex gap-2">
        <Button variant="secondary" className="!h-8 !px-3" onClick={onKeep}>Keep</Button>
        <Button variant="secondary" className="!h-8 !px-3" onClick={onUndo}>Undo</Button>
      </div>
    </li>
  );
}
