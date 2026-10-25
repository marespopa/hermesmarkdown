"use client";

import { useEffect } from "react";
import { useSetAtom } from "jotai";
import type { EditorView } from "@codemirror/view";
import { atom_gitAvailable, atom_gitLoading } from "@/app/atoms/git-atoms";
import { getHead, getHeadBlob } from "@/app/services/git-read-client";
import { gitChangesField, setGitBaseline, type GitBaseline } from "../codemirror/git-changes";

const POLL_MS = 5000;
const READY_RETRY_MS = 50;
const READY_RETRIES = 100;

interface UseGitBaselineOptions {
  viewRef: React.RefObject<EditorView | null>;
  vaultHandle: FileSystemDirectoryHandle | null | undefined;
  /** The open file's vault-relative path. */
  filePath: string;
  /** Git Changes on, a disk vault, and a vault file (not a draft). */
  enabled: boolean;
}

// Feeds the Git Changes diff (codemirror/git-changes.ts) its baseline: the
// open file's text at HEAD, read through the git-read worker. HEAD is checked
// again when the window regains focus or becomes visible and every 5 s while
// focused; the blob is re-read only when HEAD's stamp changed.
export function useGitBaseline({ viewRef, vaultHandle, filePath, enabled }: UseGitBaselineOptions) {
  const setGitAvailable = useSetAtom(atom_gitAvailable);
  const setGitLoading = useSetAtom(atom_gitLoading);

  useEffect(() => {
    if (!enabled || !vaultHandle) return;
    let cancelled = false;
    let lastStamp: string | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    // Counted in atom_gitLoading from the start of a read until its baseline
    // reaches the editor (or the read fails or is dropped).
    let busy = false;
    const setBusy = (next: boolean) => {
      if (busy === next) return;
      busy = next;
      setGitLoading((count) => count + (next ? 1 : -1));
    };

    // The editor is created asynchronously and the diff is installed by an
    // effect of its own, so wait until the view has the field.
    const publish = (baseline: GitBaseline, attempt = 0) => {
      if (cancelled) return;
      const view = viewRef.current;
      if (view && view.state.field(gitChangesField, false)) {
        view.dispatch({ effects: setGitBaseline.of(baseline) });
        setBusy(false);
      } else if (attempt < READY_RETRIES) {
        retry = setTimeout(() => publish(baseline, attempt + 1), READY_RETRY_MS);
      } else {
        setBusy(false);
      }
    };

    const load = async () => {
      setBusy(true);
      try {
        await read();
      } catch {
        setBusy(false);
      }
    };

    const read = async () => {
      const head = await getHead(vaultHandle);
      if (cancelled) return;
      setGitAvailable(head.available);
      lastStamp = head.stamp;
      if (!head.available) {
        publish("off");
        return;
      }
      if (!head.commit) {
        publish({ text: null });
        return;
      }
      const blob = await getHeadBlob(vaultHandle, head.commit, filePath);
      if (cancelled) return;
      if (blob.status === "ok") publish({ text: blob.text ?? "" });
      else if (blob.status === "missing") publish({ text: null });
      else publish("off");
    };

    const check = async () => {
      const head = await getHead(vaultHandle);
      if (cancelled || head.stamp === lastStamp) return;
      await load();
    };

    const onFocus = () => void check();
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const interval = setInterval(() => {
      if (document.hasFocus()) void check();
    }, POLL_MS);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    void load();

    return () => {
      cancelled = true;
      clearTimeout(retry);
      setBusy(false);
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, vaultHandle, filePath, viewRef, setGitAvailable, setGitLoading]);
}
