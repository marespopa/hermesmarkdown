"use client";

import { useAtomValue } from "jotai";
import { useMemo, useState } from "react";
import { atom_vaultDescriptor } from "@/app/atoms/atoms";
import Button from "@/app/components/Button";
import { formatCount } from "@/app/components/CountBadge";
import LoadingBar from "@/app/components/LoadingBar";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { isMarkdownPath, isPlainTextPath } from "@/app/utils/file-kinds";
import { ChangesBodySkeleton } from "../components/RouteSkeletons";
import ShellPage from "../components/ShellPage";
import ChangesSummary from "./components/ChangesSummary";
import FileDiffSection from "./components/FileDiffSection";
import { firstChangeLine, initialCollapsed } from "./diff-layout";
import { useGitChanges } from "./use-git-changes";
import { useOpenChange } from "./use-open-change";

const NOTE = "text-ui-footnote text-fg-muted";

export default function ChangesPage() {
  const { vaultHandle } = useFileSystem();
  const descriptor = useAtomValue(atom_vaultDescriptor);
  const isDisk = !!vaultHandle && descriptor?.kind === "local";
  const { result, scanning, progress, rescan } = useGitChanges(vaultHandle ?? null, isDisk);
  const openChange = useOpenChange();
  // What the user toggled, by path; everything else follows the initial layout.
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());

  const files = useMemo(() => (result?.status === "ok" ? result.files : []), [result]);
  const defaults = useMemo(() => initialCollapsed(files), [files]);
  const isCollapsed = (path: string) => overrides.get(path) ?? defaults.has(path);
  const setCollapsed = (paths: string[], collapsed: boolean) =>
    setOverrides((current) => {
      const next = new Map(current);
      for (const path of paths) next.set(path, collapsed);
      return next;
    });

  const jump = (path: string, index: number) => {
    setCollapsed([path], false);
    document.getElementById("change-" + index)?.scrollIntoView?.({ block: "start" });
  };

  let body;
  if (!vaultHandle) {
    body = <p className={NOTE}>Open a vault to see its changes.</p>;
  } else if (!isDisk || result?.status === "no-repo") {
    body = <p className={NOTE}>No git repository here. Changes reads the <code>.git</code> folder at the root of a vault on disk.</p>;
  } else if (result?.status === "error") {
    body = (
      <div className="flex items-center gap-3">
        <p className={NOTE}>Couldn&apos;t read the repository.</p>
        <Button variant="small" onClick={rescan}>Try Again</Button>
      </div>
    );
  } else if (result?.status === "ok" && files.length === 0) {
    body = <p className={NOTE}>No changes since the last commit.{result.commit ? ` ${result.commit.slice(0, 7)}` : ""}</p>;
  } else if (result?.status === "ok") {
    body = (
      <>
        <ChangesSummary
          files={files}
          commit={result.commit}
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
              onToggle={() => setCollapsed([file.path], !isCollapsed(file.path))}
              onOpen={canOpen ? (line) => void openChange(file.path, line) : undefined}
              pathLine={firstChangeLine(file)}
            />
          );
        })}
      </>
    );
  } else if (scanning) {
    // The page's shape while the scan runs; a large vault also counts the files compared.
    body = (
      <div className="loading-bar-appear space-y-4" aria-hidden="true" data-testid="changes-skeleton">
        {progress?.phase === "comparing" && (
          <p className={NOTE}>Checking {formatCount(progress.done)} of {formatCount(progress.total)} files…</p>
        )}
        <ChangesBodySkeleton />
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
