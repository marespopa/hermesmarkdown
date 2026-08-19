"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import { atom_vaultHandle, atom_currentDirectoryHandle } from "@/app/atoms/atoms";
import { resolveVaultFileHandle } from "@/app/utils/resolve-vault-file";

export default function ImageDialog() {
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const currentDirectoryHandle = useAtomValue(atom_currentDirectoryHandle);

  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState("image");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const revokeBlobUrl = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const openAndResolve = useCallback(async (rawSrc: string, alt?: string) => {
    revokeBlobUrl();
    setOpen(true);
    setLoading(true);
    setError(null);
    setSrc(null);
    setFileName(alt || "image");

    // Root-relative paths (e.g. "/assets/foo.png") are web-root paths, not vault-relative ones.
    if (/^(https?:|data:|blob:|\/)/i.test(rawSrc)) {
      setSrc(rawSrc);
      setLoading(false);
      return;
    }

    if (!vaultHandle) {
      setError("Open a vault folder to view local images");
      setLoading(false);
      return;
    }

    try {
      const fileHandle = await resolveVaultFileHandle(vaultHandle, currentDirectoryHandle, decodeURI(rawSrc));
      const file = await fileHandle.getFile();
      const url = URL.createObjectURL(file);
      blobUrlRef.current = url;
      setFileName(file.name);
      setSrc(url);
    } catch (err: any) {
      setError(err?.message || "Failed to load image");
    } finally {
      setLoading(false);
    }
  }, [vaultHandle, currentDirectoryHandle, revokeBlobUrl]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      const detail = ce.detail as { src: string; alt?: string } | undefined;
      if (!detail?.src) return;
      openAndResolve(detail.src, detail.alt);
    };
    document.addEventListener("hermes:open-image-dialog", handler as EventListener);
    return () => document.removeEventListener("hermes:open-image-dialog", handler as EventListener);
  }, [openAndResolve]);

  useEffect(() => () => revokeBlobUrl(), [revokeBlobUrl]);

  return (
    <DialogModal
      isOpened={open}
      onClose={() => setOpen(false)}
      styles="!max-w-[1200px] !rounded-3xl !backdrop-blur-lg"
    >
      <div className="w-full min-w-0">
        <div className="mb-3">
          <h3 className="text-lg font-semibold truncate pr-10">{fileName}</h3>
        </div>
        <div className="relative h-[70vh] overflow-auto bg-paper-light/50 dark:bg-paper-dark/40 rounded-md p-4 flex items-center justify-center">
          {loading && <div>Loading…</div>}
          {error && <div className="text-red-500">{error}</div>}
          {src && !loading && !error && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={fileName} className="max-w-full max-h-full object-contain" />
          )}
        </div>
      </div>
    </DialogModal>
  );
}
