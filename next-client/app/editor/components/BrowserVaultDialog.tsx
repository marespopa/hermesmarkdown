"use client";

import { useCallback, useEffect, useState } from "react";
import { useAtom } from "jotai";
import { HiOutlineTrash } from "react-icons/hi";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Input from "@/app/components/Input";
import { atom_browserVaultDialogOpen } from "@/app/atoms/ui-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import {
  formatBytes,
  getStorageStatus,
  requestPersistentStorage,
  type BrowserVaultDescriptor,
  type StorageStatus,
} from "@/app/services/opfs";

function formatDate(timestamp: number | undefined): string | null {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Create, reopen, or delete vaults kept in the browser's private storage, and
// see how much storage they use.
export default function BrowserVaultDialog() {
  const [isOpen, setIsOpen] = useAtom(atom_browserVaultDialogOpen);
  const { listBrowserVaults, createBrowserVault, openBrowserVault, deleteBrowserVault } = useFileSystem();
  const [vaults, setVaults] = useState<BrowserVaultDescriptor[]>([]);
  const [vaultName, setVaultName] = useState("");
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nextVaults, nextStorage] = await Promise.all([listBrowserVaults(), getStorageStatus()]);
      setVaults(nextVaults);
      setStorage(nextStorage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Browser storage is unavailable.");
    }
  }, [listBrowserVaults]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setConfirmDeleteId(null);
    void refresh();
  }, [isOpen, refresh]);

  const close = () => {
    if (isBusy) return;
    setIsOpen(false);
  };

  const run = async (action: () => Promise<boolean>, closeOnSuccess: boolean) => {
    setIsBusy(true);
    setError(null);
    try {
      const ok = await action();
      if (ok && closeOnSuccess) {
        setIsOpen(false);
      } else {
        await refresh();
      }
    } finally {
      setIsBusy(false);
    }
  };

  const create = () => {
    if (!vaultName.trim()) {
      setError("Give the vault a name.");
      return;
    }
    void run(async () => {
      const ok = await createBrowserVault(vaultName);
      if (ok) setVaultName("");
      return ok;
    }, true);
  };

  const keepData = async () => {
    const persisted = await requestPersistentStorage();
    if (!persisted) setError("The browser declined. Installing the app usually allows it.");
    await refresh();
  };

  return (
    <DialogModal isOpened={isOpen} onClose={close} styles="!max-w-lg" ariaLabelledBy="browser-vault-title" mobileSheet>
      <div className="space-y-5">
        <div>
          <h2 id="browser-vault-title" className="text-ui-title-3 font-bold">Browser Vaults</h2>
          <p className="mt-1 text-ui-footnote text-fg-muted">
            Notes are stored privately in this browser and work offline. They are not visible
            as files on disk, so export the vault regularly as a backup.
          </p>
        </div>

        <div className="flex gap-2 items-end">
          <Input
            name="browser-vault-name"
            label="New vault"
            value={vaultName}
            handleChange={(event) => setVaultName(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") create(); }}
            placeholder="My notes"
            disabled={isBusy}
          />
          <Button
            variant="primary"
            className="shrink-0 mb-2"
            onClick={create}
            disabled={!vaultName.trim() || isBusy}
          >
            Create
          </Button>
        </div>

        {error && <p role="alert" className="text-ui-footnote text-red-600">{error}</p>}

        <div className="max-h-64 overflow-y-auto rounded-xl border border-edge">
          {vaults.length === 0 ? (
            <p className="p-4 text-ui-footnote text-fg-muted">No browser vaults yet. Create one above.</p>
          ) : (
            vaults.map((vault) => {
              const created = formatDate(vault.createdAt);
              const exported = formatDate(vault.lastExportedAt);
              return (
                <div key={vault.id} className="flex items-center gap-1 pr-2 border-b border-edge last:border-b-0">
                  {confirmDeleteId === vault.id ? (
                    <div className="flex flex-1 items-center justify-between gap-2 px-4 py-2">
                      <span className="text-ui-footnote">Delete “{vault.displayName}” and all its notes?</span>
                      <span className="flex shrink-0 gap-2">
                        <Button variant="tertiary" onClick={() => setConfirmDeleteId(null)} disabled={isBusy}>Cancel</Button>
                        <Button variant="warning" onClick={() => void run(() => deleteBrowserVault(vault), false)} disabled={isBusy}>
                          Delete
                        </Button>
                      </span>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="menu-item"
                        className="rounded-none text-left flex-1"
                        onClick={() => void run(() => openBrowserVault(vault), true)}
                        disabled={isBusy}
                      >
                        <span className="min-w-0">
                          <span className="block truncate">{vault.displayName}</span>
                          <span className="block text-ui-caption text-fg-faint">
                            {created ? `Created ${created}` : "Recovered from storage"}
                            {` · ${exported ? `Backed up ${exported}` : "Never backed up"}`}
                          </span>
                        </span>
                      </Button>
                      <Button
                        variant="icon"
                        aria-label={`Delete ${vault.displayName}`}
                        onClick={() => setConfirmDeleteId(vault.id)}
                        disabled={isBusy}
                      >
                        <HiOutlineTrash size={16} />
                      </Button>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {storage && (
          <div className="flex items-center justify-between gap-3 text-ui-caption text-fg-muted">
            <span>
              Using {formatBytes(storage.usage)}
              {storage.quota !== null ? ` of ${formatBytes(storage.quota)}` : ""}
              {" · "}
              {storage.persisted ? "Kept by the browser" : "May be cleared by the browser"}
            </span>
            {!storage.persisted && (
              <Button variant="tertiary" className="shrink-0" onClick={() => void keepData()} disabled={isBusy}>
                Keep data
              </Button>
            )}
          </div>
        )}
      </div>
    </DialogModal>
  );
}
