"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { HiOutlineDocumentText } from "react-icons/hi";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_noteDisplayItems } from "@/app/atoms/privacy-atoms";
import Button from "@/app/components/Button";
import CountBadge from "@/app/components/CountBadge";
import { useFileSystem } from "@/app/hooks/use-file-system";
import ShellPage from "../components/ShellPage";
import { SIDEBAR_ICON_CLASS, sidebarItemClass } from "../components/sidebar/sidebar-classes";
import { formatModified } from "../components/vault-tree/list-columns";
import { editorFileHref, readUrlParam, replaceUrlParam, TAG_PARAM } from "../utils/editor-url";

interface TagEntry {
  tag: string;
  count: number;
}

// Tags: every tag in the vault with how many notes carry it, and the notes
// of the one you pick, most recently changed first. The pick is in the URL
// (`?tag=release`), so a refresh or a link lands on it. Only notes that
// listings may show count (atom_noteDisplayItems), so Privacy Mode applies
// to the counts as well as the titles. A note opens in the editor at its URL.
export default function TagsPage() {
  const router = useRouter();
  const { openFile, vaultHandle } = useFileSystem();
  const metadata = useAtomValue(atom_fileMetadata);
  const displayItems = useAtomValue(atom_noteDisplayItems);
  const [selected, setSelected] = useState<string | null>(null);

  // Read after mount: the URL doesn't exist on the server.
  useEffect(() => setSelected(readUrlParam(TAG_PARAM)), []);

  const tags = useMemo<TagEntry[]>(() => {
    const counts = new Map<string, number>();
    for (const meta of Object.values(metadata)) {
      if (!displayItems.has(meta.path)) continue;
      for (const tag of meta.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => a.tag.localeCompare(b.tag));
  }, [metadata, displayItems]);

  const notes = useMemo(
    () => selected
      ? Object.values(metadata)
          .filter((meta) => meta.tags.includes(selected) && displayItems.has(meta.path))
          .sort((a, b) => b.modifiedAt - a.modifiedAt)
      : [],
    [metadata, displayItems, selected],
  );

  const pick = (tag: string | null) => {
    setSelected(tag);
    replaceUrlParam(TAG_PARAM, tag);
  };

  const open = async (path: string) => {
    const handle = metadata[path]?.handle as FileSystemFileHandle | undefined;
    if (!handle) return;
    await openFile(handle, path);
    router.push(editorFileHref(path));
  };

  return (
    <ShellPage title="Tags">
      {!vaultHandle ? (
        <p className="m-8 rounded-xl border border-edge-subtle bg-surface px-4 py-3 text-ui-footnote text-fg-muted">
          Open a vault to see its tags.
        </p>
      ) : tags.length === 0 ? (
        <p className="m-8 text-ui-footnote text-fg-muted">
          No tags yet. Add one anywhere in a note, like <code>#idea</code>, or in its frontmatter.
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav aria-label="Tags" className="shrink-0 overflow-y-auto custom-scrollbar border-b border-edge-subtle p-2 md:w-60 md:border-b-0 md:border-r max-md:max-h-48">
            {tags.map(({ tag, count }) => (
              <Button
                key={tag}
                variant="unstyled"
                onClick={() => pick(tag === selected ? null : tag)}
                aria-current={tag === selected ? "page" : undefined}
                className={`w-full ${sidebarItemClass(tag === selected)}`}
              >
                <span aria-hidden="true" className={`${SIDEBAR_ICON_CLASS} w-[15px] text-center`}>#</span>
                <span className="flex-1 min-w-0 truncate">{tag}</span>
                <CountBadge count={count} />
              </Button>
            ))}
          </nav>
          <main className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
            <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8">
              {!selected ? (
                <p className="text-ui-footnote text-fg-muted">Pick a tag to see its notes.</p>
              ) : (
                <>
                  <h1 className="mb-4 text-ui-title-2 font-semibold tracking-tight">#{selected}</h1>
                  {notes.length === 0 ? (
                    <p className="text-ui-footnote text-fg-muted">No notes carry this tag.</p>
                  ) : (
                    <ul aria-label={`Notes tagged ${selected}`} className="divide-y divide-edge-subtle overflow-hidden rounded-xl border border-edge-subtle bg-surface">
                      {notes.map((meta) => {
                        const display = displayItems.get(meta.path)!;
                        const folder = meta.path.split("/").slice(0, -1).join("/");
                        return (
                          <li key={meta.path}>
                            <Button
                              variant="unstyled"
                              onClick={() => void open(meta.path)}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-fill"
                            >
                              <HiOutlineDocumentText size={16} aria-hidden className="shrink-0 text-fg-faint" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-ui-subhead">{display.title}</span>
                                <span className="block truncate text-ui-caption text-fg-faint">
                                  {[folder, formatModified(meta.modifiedAt)].filter(Boolean).join(" · ")}
                                </span>
                              </span>
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      )}
    </ShellPage>
  );
}
