"use client";

import React, { useMemo } from "react";
import { useAtomValue } from "jotai";
import { selectAtom } from "jotai/utils";
import type { IconType } from "react-icons";
import { HiOutlineBookmark, HiOutlineBriefcase, HiOutlineCheckCircle, HiOutlineCode, HiOutlineDocumentText, HiOutlinePhotograph, HiOutlineUserGroup } from "react-icons/hi";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { isImagePath, isPlainTextPath } from "@/app/utils/file-kinds";
import { noteTypeOf } from "@/app/utils/note-type";

const TYPE_ICONS: Record<string, IconType> = {
  project: HiOutlineBriefcase,
  task: HiOutlineCheckCircle,
  meeting: HiOutlineUserGroup,
  bookmark: HiOutlineBookmark,
};

// A file row's glyph, neutral like every sidebar icon: a note's document
// type (frontmatter `type:` or a `type/…` tag) picks its icon, a text file
// that isn't a note shows a code glyph, anything else the note glyph. Each
// row subscribes to its own note's type only.
export default function FileIcon({ path }: { path: string }) {
  const typeAtom = useMemo(() => selectAtom(atom_fileMetadata, (metadata) => noteTypeOf(metadata[path])), [path]);
  const type = useAtomValue(typeAtom);
  return renderIcon((type && TYPE_ICONS[type]) || (isImagePath(path) ? HiOutlinePhotograph : isPlainTextPath(path) ? HiOutlineCode : HiOutlineDocumentText), type);
}

// Called, not rendered as a component chosen during render (react-hooks/static-components).
function renderIcon(icon: IconType, type: string | null) {
  return icon({ size: 16, "aria-hidden": true, "data-icon": type ?? undefined, className: "shrink-0 text-fg-faint" } as React.ComponentProps<IconType>);
}
