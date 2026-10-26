"use client";

import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { HiOutlineDocumentText, HiOutlineFolder, HiOutlineReply, HiOutlineTrash } from "react-icons/hi";
import Button from "@/app/components/Button";
import { useDialog } from "@/app/hooks/use-dialog";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { deleteTrashSlot, listTrash, restoreFromTrash, type TrashedItem } from "@/app/hooks/file-system/trash-ops";
import { TRASH_RETENTION_DAYS } from "@/app/services/vault-trash";
import ShellPage from "../components/ShellPage";

const deletedLabel = (date: Date | null) =>
  date ? `Deleted ${date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}` : "Deleted";

// The vault's Trash (`.hermesmarkdown/trash`): what Move to Trash put there, newest
// first, each with where it came from. Put Back moves it there again (its
// folders made again if need be); Delete, or Empty Trash, removes it for
// good after asking. Items are emptied on their own after the retention
// period. While one is being put back or deleted its buttons are disabled
// and it shows a spinner.
export default function TrashPage() {
  const { vaultHandle, scanVault, indexVaultTags } = useFileSystem();
  const dialog = useDialog();
  const [items, setItems] = useState<TrashedItem[] | null>(null);
  // Trash paths being put back or deleted.
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const markBusy = (targets: TrashedItem[], on: boolean) => setBusy((prev) => {
    const next = new Set(prev);
    for (const item of targets) {
      if (on) next.add(item.trashPath);
      else next.delete(item.trashPath);
    }
    return next;
  });

  const reload = useCallback(async () => {
    setItems(vaultHandle ? await listTrash(vaultHandle) : []);
  }, [vaultHandle]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const putBack = async (item: TrashedItem) => {
    if (!vaultHandle || busy.has(item.trashPath)) return;
    markBusy([item], true);
    try {
      const path = await restoreFromTrash(vaultHandle, item);
      await scanVault(vaultHandle);
      void indexVaultTags();
      toast.success(`Put “${item.name}” back in ${path.includes("/") ? path.split("/").slice(0, -1).join("/") : "the vault"}`);
    } catch (err: any) {
      toast.error(err?.message || `Couldn't put “${item.name}” back`);
    }
    await reload();
    markBusy([item], false);
  };

  const remove = async (targets: TrashedItem[], message: string) => {
    if (!vaultHandle || targets.length === 0) return;
    if (!(await dialog.confirm(message, "Delete Permanently", "Delete"))) return;
    markBusy(targets, true);
    for (const slot of new Set(targets.map((item) => item.slot))) {
      try {
        await deleteTrashSlot(vaultHandle, slot);
      } catch (err) {
        console.error("Failed to delete from the Trash:", err);
        toast.error("Couldn't delete everything");
      }
    }
    await reload();
    markBusy(targets, false);
  };

  return (
    <ShellPage title="Trash">
      <main className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
        <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-8">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-ui-title-2 font-semibold tracking-tight">Trash</h1>
              <p className="mt-1 text-ui-footnote text-fg-muted">
                Deleted notes and folders stay here for {TRASH_RETENTION_DAYS} days, then they&apos;re removed for good.
              </p>
            </div>
            {!!items?.length && (
              <Button
                variant="small"
                isDisabled={busy.size > 0}
                onClick={() => void remove(items, `Delete all ${items.length} items in the Trash? This cannot be undone.`)}
              >
                <HiOutlineTrash size={14} aria-hidden /> Empty Trash
              </Button>
            )}
          </div>

          {!vaultHandle ? (
            <p className="rounded-xl border border-edge-subtle bg-surface px-4 py-3 text-ui-footnote text-fg-muted">
              Open a vault to see its Trash.
            </p>
          ) : items === null ? null : items.length === 0 ? (
            <p className="text-ui-footnote text-fg-muted">The Trash is empty.</p>
          ) : (
            <ul aria-label="Trashed items" className="divide-y divide-edge-subtle overflow-hidden rounded-xl border border-edge-subtle bg-surface">
              {items.map((item) => {
                const from = item.originalPath?.split("/").slice(0, -1).join("/");
                const isBusy = busy.has(item.trashPath);
                return (
                  <li key={item.trashPath} aria-busy={isBusy || undefined} className="flex items-center gap-3 px-4 py-2.5">
                    {item.kind === "directory"
                      ? <HiOutlineFolder size={16} aria-hidden className="shrink-0 text-fg-faint" />
                      : <HiOutlineDocumentText size={16} aria-hidden className="shrink-0 text-fg-faint" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-ui-subhead">{item.name.replace(/\.md$/, "")}</p>
                      <p className="truncate text-ui-caption text-fg-faint">
                        {deletedLabel(item.deletedAt)}{from ? ` from ${from}` : ""}
                      </p>
                    </div>
                    {isBusy && (
                      // After a moment (a quick one shows nothing).
                      <span role="status" aria-label="Working…" className="loading-bar-appear flex h-3 w-3 shrink-0 items-center justify-center">
                        <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-fg-faint border-t-transparent motion-reduce:animate-none" />
                      </span>
                    )}
                    <Button variant="small" isDisabled={isBusy} onClick={() => void putBack(item)} aria-label={`Put back ${item.name}`}>
                      <HiOutlineReply size={14} aria-hidden /> Put Back
                    </Button>
                    <Button
                      variant="small"
                      isDisabled={isBusy}
                      onClick={() => void remove([item], `Delete “${item.name}” permanently? This cannot be undone.`)}
                      aria-label={`Delete ${item.name} permanently`}
                    >
                      Delete
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </ShellPage>
  );
}
