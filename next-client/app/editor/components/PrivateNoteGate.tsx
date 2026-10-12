"use client";

import React, { useEffect, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import {
  atom_revealAllPrivate,
  atom_revealedPrivatePaths,
  atom_revealPrivatePath,
} from "@/app/atoms/privacy-atoms";
import { parseFmFields } from "@/app/utils/frontmatter-utils";
import { noteDisplayTitle } from "@/app/utils/note-display";
import { isPrivateContent, isPrivateFrontmatter } from "@/app/utils/note-privacy";
import PrivateNoteVeil from "./PrivateNoteVeil";

interface PrivateNoteGateProps {
  filePath: string;
  content: string;
  isActivePane: boolean;
  children: React.ReactNode;
}

// Mounts the editor (children) only once a private note is revealed, so its
// text never reaches the DOM (browser find, screen readers, the @ heading
// scope) while veiled. PaneLeaf keys the gate like the editor, so the
// "already shown" latch lives exactly as long as the editor instance.
export default function PrivateNoteGate({ filePath, content, isActivePane, children }: PrivateNoteGateProps) {
  const metadata = useAtomValue(atom_fileMetadata);
  const [revealAll, setRevealAll] = useAtom(atom_revealAllPrivate);
  const revealed = useAtomValue(atom_revealedPrivatePaths);
  const revealPath = useSetAtom(atom_revealPrivatePath);
  // Set once the editor has shown non-empty content: typing `private: true`
  // into an open note, or saving a draft as a file, never hides it mid-edit.
  const shownRef = useRef(false);

  const meta = metadata[filePath];
  // The content check catches notes opened before the indexer reached them.
  const isPrivate = isPrivateContent(content) || isPrivateFrontmatter(meta?.frontmatter);
  const veiled = isPrivate && !revealAll && !revealed.has(filePath) && !shownRef.current;
  if (!veiled && content.trim()) shownRef.current = true;
  // A note marked private while shown stays revealed for the session, so a
  // tab switch or rename doesn't veil it again (the path remap carries it).
  const latchedPrivate = isPrivate && shownRef.current && !revealAll && !revealed.has(filePath);
  useEffect(() => {
    if (latchedPrivate && filePath !== "draft") revealPath(filePath);
  }, [latchedPrivate, filePath, revealPath]);

  if (!veiled) return <>{children}</>;

  const title = noteDisplayTitle(
    meta ?? { name: filePath === "draft" ? "" : filePath.split("/").pop() ?? "", frontmatter: parseFmFields(content) },
    true,
  );
  return (
    <PrivateNoteVeil
      title={title}
      isActivePane={isActivePane}
      onShowNote={() => revealPath(filePath)}
      onShowAll={() => setRevealAll(true)}
    />
  );
}
