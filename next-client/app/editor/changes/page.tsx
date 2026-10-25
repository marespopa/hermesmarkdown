"use client";

import { useAtomValue } from "jotai";
import { useCallback, useMemo, useState } from "react";
import { atom_isVaultPending, atom_vaultDescriptor } from "@/app/atoms/atoms";
import Button from "@/app/components/Button";
import LoadingBar from "@/app/components/LoadingBar";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { isMarkdownPath, isPlainTextPath } from "@/app/utils/file-kinds";
import { ChangesBodySkeleton } from "../components/RouteSkeletons";
import ShellPage from "../components/ShellPage";
import ChangesSummary from "./components/ChangesSummary";
import FileDiffSection from "./components/FileDiffSection";
import ScanStatus, { scanStatus } from "./components/ScanStatus";
import { firstChangeLine, initialCollapsed } from "./diff-layout";
import { useGitChanges } from "./use-git-changes";
import { useOpenChange } from "./use-open-change";

const NOTE = "text-ui-footnote text-fg-muted";

export default function ChangesPage() {
  const { vaultHandle } = useFileSystem();
  const descriptor = useAtomValue(atom_vaultDescriptor);
  const isDisk = !!vaultHandle && descriptor?.kind === "local";
  // A restored vault waits for the user to allow access; scanning before that is refused.
  const isPending = useAtomValue(atom_isVaultPending);
  const { result, found, scanning, progress, rescan } = useGitChanges(vaultHandle ?? null, isDisk && !isPending);
  const openChange = useOpenChange();
  // What the user toggled, by path; everything else follows the initial layout.
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());

  // The finished (or cached) result, else the files the running scan found so far.
  const partial = !result && scanning && found.length > 0;
  const files = useMemo(() => (result?.status === "ok" ? result.files : partial ? found : []), [result, partial, found]);
  const defaults = useMemo(() => initialCollapsed(files), [files]);
  // Says whether the files shown are all of them, or a scan is still checking.
  const status = <ScanStatus scanning={scanning} progress={progress} hasResult={result?.status === "ok"} />;
  const isCollapsed = (path: string) => overrides.get(path) ?? defaults.has(path);
  const setCollapsed = useCallback(
    (paths: string[], collapsed: boolean) =>
      setOverrides((current) => {
        const next = new Map(current);
        for (const path of paths) next.set(path, collapsed);
        return next;
      }),
    [],
  );
  // Stable, so the memoized sections re-render only when their own props change.
  const collapseOne = useCallback((path: string, collapsed: boolean) => setCollapsed([path], collapsed), [setCollapsed]);
  const openAt = useCallback((path: string, line: number) => void openChange(path, line), [openChange]);

  const jump = (path: string, index: number) => {
    setCollapsed([path], false);
    document.getElementById("change-" + index)?.scrollIntoView?.({ block: "start" });
  };

  let body;
  if (!vaultHandle) {
    body = <p className={NOTE}>Open a vault to see its changes.</p>;
  } else if (isDisk && isPending) {
    body = <p className={NOTE}>Allow access to the vault&apos;s folder to see its changes.</p>;
  } else if (!isDisk) {
    body = <p className={NOTE}>This vault is stored in the browser. Changes reads the <code>.git</code> folder of a vault opened from a folder on disk.</p>;
  } else if (result?.status === "no-repo") {
    body = (
      <p className={NOTE}>
        No <code>.git</code> folder at the root of <strong>{vaultHandle.name}</strong>. Open the repository&apos;s top folder as the vault to see its changes.
      </p>
    );
  } else if (result?.status === "error") {
    body = (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <p className={NOTE}>Couldn&apos;t read the repository.</p>
          <Button variant="small" onClick={rescan}>Try Again</Button>
        </div>
        {result.detail && <p className={`${NOTE} font-mono break-all`}>{result.detail}</p>}
      </div>
    );
  } else if (result?.status === "ok" && files.length === 0) {
    body = (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className={NOTE}>No changes since the last commit.{result.commit ? ` ${result.commit.slice(0, 7)}` : ""}</p>
        {status}
      </div>
    );
  } else if (result?.status === "ok" || partial) {
    body = (
      <>
        <ChangesSummary
          files={files}
          commit={result?.status === "ok" ? result.commit : null}
          status={status}
          onJump={(path) => jump(path, files.findIndex((file) => file.path === path))}
          onCollapseAll={() => setCollapsed(files.map((file) => file.path), true)}
          onExpandAll={() => setCollapsed(files.map((file) => file.path), false)}
        />
        {files.map((file, index) => {
          const canOpen = file.status !== "deleted" && (isMarkdownPath(file.path) || isPlainTextPath(file.path));
          return (
            <FileDiffSection
              key={file.path}
              id={"change-" + index}
              file={file}
              collapsed={isCollapsed(file.path)}
              onCollapse={collapseOne}
              onOpen={canOpen ? openAt : undefined}
              pathLine={firstChangeLine(file)}
            />
          );
        })}
      </>
    );
  } else if (scanning) {
    // The page's shape while the scan runs, under a line saying how far it got.
    body = (
      <div className="loading-bar-appear space-y-4" data-testid="changes-skeleton">
        <p className={NOTE} role="status">{scanStatus(progress)}</p>
        <div className="space-y-4" aria-hidden="true">
          <ChangesBodySkeleton />
        </div>
      </div>
    );
  }

  return (
    <ShellPage title="Changes">
      <LoadingBar isVisible={scanning} label="Checking changes" />
      <main className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
        <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-8 sm:px-8">{body}</div>
      </main>
    </ShellPage>
  );
}
