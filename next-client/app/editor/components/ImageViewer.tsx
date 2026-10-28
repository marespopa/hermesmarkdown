"use client";

import React, { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { atom_vaultHandle } from "@/app/atoms/atoms";
import { resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { imageUrlFor } from "../utils/embed-files";

interface ImageViewerProps {
  /** Vault path of the image file. */
  path: string;
}

// An opened image file, shown fitted in the pane. It is read from the vault
// each time the path changes, through the same cached, SVG-sanitising blob URL
// the note embeds use, so a script in an SVG never runs.
export default function ImageViewer({ path }: ImageViewerProps) {
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const [shown, setShown] = useState<{ path: string; url: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let url: string | null = null;
      try {
        if (vaultHandle) {
          const file = await (await resolveFileHandleAtPath(vaultHandle, path)).getFile();
          url = await imageUrlFor({ path, file });
        }
      } catch {
        // Missing or unreadable: the message below.
      }
      if (!cancelled) setShown({ path, url });
    })();
    return () => { cancelled = true; };
  }, [vaultHandle, path]);

  const current = shown?.path === path ? shown : null;
  if (!current) return <div role="status" className="sr-only">Opening {path}…</div>;
  if (!current.url) {
    return <p role="alert" className="p-6 text-sm text-fg-faint">This image can't be shown.</p>;
  }
  return (
    <div className="flex h-full items-center justify-center overflow-auto p-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={current.url} alt={path.split("/").pop() ?? path} className="max-h-full max-w-full object-contain" />
    </div>
  );
}
