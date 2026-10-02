"use client";

import React, { useEffect, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import {
  atom_revealAllSensitive,
  atom_revealedSensitivePaths,
  atom_revealSensitivePath,
} from "@/app/atoms/privacy-atoms";
import { parseFmFields } from "@/app/utils/frontmatter-utils";
import { noteDisplayTitle } from "@/app/utils/note-display";
import { isSensitiveContent, isSensitiveFrontmatter } from "@/app/utils/note-privacy";
import SensitiveNoteVeil from "./SensitiveNoteVeil";

interface SensitiveNoteGateProps {
  filePath: string;
  content: string;
  isActivePane: boolean;
  children: React.ReactNode;
}

// Mounts the editor (children) only once a sensitive note is revealed, so its
// text never reaches the DOM (browser find, screen readers, the @ heading
// scope) while veiled. PaneLeaf keys the gate like the editor, so the
// "already shown" latch lives exactly as long as the editor instance.
export default function SensitiveNoteGate({ filePath, content, isActivePane, children }: SensitiveNoteGateProps) {
  const metadata = useAtomValue(atom_fileMetadata);
  const [revealAll, setRevealAll] = useAtom(atom_revealAllSensitive);
  const revealed = useAtomValue(atom_revealedSensitivePaths);
  const revealPath = useSetAtom(atom_revealSensitivePath);
  // Set once the editor has shown non-empty content: typing `sensitive: true`
  // into an open note, or saving a draft as a file, never hides it mid-edit.
  const shownRef = useRef(false);

  const meta = metadata[filePath];
  // The content check catches notes opened before the indexer reached them.
  const sensitive = isSensitiveContent(content) || isSensitiveFrontmatter(meta?.frontmatter);
  const veiled = sensitive && !revealAll && !revealed.has(filePath) && !shownRef.current;
  if (!veiled && content.trim()) shownRef.current = true;
  // A note marked sensitive while shown stays revealed for the session, so a
  // tab switch or rename doesn't veil it again (the path remap carries it).
  const latchedSensitive = sensitive && shownRef.current && !revealAll && !revealed.has(filePath);
  useEffect(() => {
    if (latchedSensitive && filePath !== "draft") revealPath(filePath);
  }, [latchedSensitive, filePath, revealPath]);

  if (!veiled) return <>{children}</>;

  const title = noteDisplayTitle(
    meta ?? { name: filePath === "draft" ? "" : filePath.split("/").pop() ?? "", frontmatter: parseFmFields(content) },
    true,
  );
  return (
    <SensitiveNoteVeil
      title={title}
      isActivePane={isActivePane}
      onShowNote={() => revealPath(filePath)}
      onShowAll={() => setRevealAll(true)}
    />
  );
}
