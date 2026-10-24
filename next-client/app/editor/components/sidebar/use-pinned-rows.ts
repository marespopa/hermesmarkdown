"use client";

import { useMemo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_pins } from "@/app/atoms/pin-atoms";
import { atom_noteDisplayItems } from "@/app/atoms/privacy-atoms";
import { atom_indexerState } from "@/app/atoms/ui-atoms";
import { atom_showFolderInFiles, atom_vaultFolderPaths } from "@/app/atoms/vault-atoms";
import { showErrorToast } from "@/app/components/Toastr";
import { pinKey, PINS_MAX, type Pin, type PinPage } from "@/app/services/vault-pins-format";
import { editorTagHref, replaceUrlParam, TAG_PARAM } from "../../utils/editor-url";
import { PINNED_PAGES } from "./pinned-pages";
import { useSidebarNavigation } from "./use-sidebar-navigation";

export interface PinnedRow {
  key: string;
  pin: Pin;
  label: string;
  /** The row's tooltip: a note's path (unless private), a folder's path. */
  title?: string;
  /** The note or folder isn't in the vault (judged once indexing is done). */
  missing: boolean;
  current: boolean;
  open: () => void;
}

const lastSegment = (path: string) => path.split("/").pop() || path;

// The Pinned section's rows, in the file's order: each pin resolved against
// the vault (titles through atom_noteDisplayItems, so Privacy Mode applies;
// a note hidden from lists is left out), whether it's the current place, and
// what a click does. A note or folder that isn't in the vault counts as
// missing only once the index is idle, so nothing flickers while it runs.
// `activePath` is the note in front on the editor (null elsewhere).
export function usePinnedRows(activePath: string | null): PinnedRow[] {
  const pins = useAtomValue(atom_pins);
  const metadata = useAtomValue(atom_fileMetadata);
  const folderPaths = useAtomValue(atom_vaultFolderPaths);
  const displayItems = useAtomValue(atom_noteDisplayItems);
  const indexed = useAtomValue(atom_indexerState) === "idle";
  const showFolderInFiles = useSetAtom(atom_showFolderInFiles);
  const pathname = usePathname() ?? "";
  const urlTag = useSearchParams()?.get(TAG_PARAM) ?? null;
  const router = useRouter();
  const { openHandle } = useSidebarNavigation();

  return useMemo(() => {
    const folders = new Set(folderPaths);
    const onTags = pathname === PINNED_PAGES.tags.href;
    const gone = (label: string) => () => showErrorToast(`“${label}” isn't in this vault any more.`);
    const rows: PinnedRow[] = [];
    // Only the first PINS_MAX (a hand-edited file may list more).
    for (const pin of pins.slice(0, PINS_MAX)) {
      const key = pinKey(pin);
      if (pin.kind === "note") {
        const meta = metadata[pin.target];
        const display = displayItems.get(pin.target);
        // Indexed but not listable: hidden by Privacy Mode.
        if (meta && !display) continue;
        const label = display?.title ?? lastSegment(pin.target).replace(/\.md$/i, "");
        const missing = indexed && !meta;
        const handle = meta?.handle as FileSystemFileHandle | null | undefined;
        rows.push({
          key, pin, label, missing,
          title: display?.isPrivate ? undefined : pin.target,
          current: pin.target === activePath,
          open: missing ? gone(label) : () => { if (handle) void openHandle(handle, pin.target); },
        });
      } else if (pin.kind === "folder") {
        const label = lastSegment(pin.target);
        const missing = indexed && !folders.has(pin.target);
        rows.push({
          key, pin, label, missing,
          title: pin.target,
          current: false,
          open: missing ? gone(label) : () => showFolderInFiles(pin.target),
        });
      } else if (pin.kind === "tag") {
        rows.push({
          key, pin, label: `#${pin.target}`, missing: false,
          current: onTags && urlTag === pin.target,
          open: () => {
            if (onTags) replaceUrlParam(TAG_PARAM, pin.target);
            else router.push(editorTagHref(pin.target));
          },
        });
      } else {
        const page = PINNED_PAGES[pin.target as PinPage];
        const here = pathname === page.href;
        rows.push({
          key, pin, label: page.label, missing: false,
          current: here && (pin.target !== "tags" || !urlTag),
          open: () => {
            if (!here) router.push(page.href);
            // Tags with a tag chosen: back to the list of tags.
            else if (pin.target === "tags" && urlTag) replaceUrlParam(TAG_PARAM, null);
          },
        });
      }
    }
    return rows;
  }, [pins, metadata, folderPaths, displayItems, indexed, pathname, urlTag, activePath, router, openHandle, showFolderInFiles]);
}
