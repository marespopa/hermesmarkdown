"use client";

import { useAtom, useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { atom_isVaultPending } from "@/app/atoms/atoms";
import { atom_lastReplace, atom_replacePrefs } from "@/app/atoms/replace-atoms";
import { formatCount } from "@/app/components/CountBadge";
import LoadingBar from "@/app/components/LoadingBar";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { isReplaceAvailable } from "@/app/services/replace-client";
import ShellPage from "../components/ShellPage";
import { useOpenChange } from "../changes/use-open-change";
import { FIND_PARAM, readUrlParam, REGEX_PARAM, replaceUrlParam } from "../utils/editor-url";
import ReplaceFileSection, { type FileState } from "./components/ReplaceFileSection";
import ReplaceForm from "./components/ReplaceForm";
import ReplaceSummary from "./components/ReplaceSummary";
import { useApplyReplace } from "./use-apply-replace";
import { useReplaceFiles } from "./use-replace-files";
import { useReplacePreview } from "./use-replace-preview";
import { useReplaceSelection } from "./use-replace-selection";

const NOTE = "text-ui-footnote text-fg-muted";

type FileStates = Record<string, { state: FileState; count: number }>;

export default function ReplacePage() {
  const { vaultHandle } = useFileSystem();
  const isPending = useAtomValue(atom_isVaultPending);
  const [prefs, setPrefs] = useAtom(atom_replacePrefs);
  const [lastReplace, setLastReplace] = useAtom(atom_lastReplace);
  const [find, setFind] = useState("");
  const [replaceWith, setReplaceWith] = useState("");
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [applied, setApplied] = useState<{ key: string; states: FileStates } | null>(null);
  const [undoing, setUndoing] = useState(false);
  const { files, hasPrivate } = useReplaceFiles(prefs.includeCode);
  const available = isReplaceAvailable();
  const query = useMemo(() => ({ find, matchCase: prefs.matchCase, wholeWord: prefs.wholeWord, regex: prefs.regex }), [find, prefs.matchCase, prefs.wholeWord, prefs.regex]);
  const preview = useReplacePreview(query, files, ready && !!vaultHandle && !isPending && available);
  const sorted = useMemo(() => [...preview.files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)), [preview.files]);
  const selection = useReplaceSelection(sorted, preview.scanKey);
  const { apply, undo } = useApplyReplace();
  const openChange = useOpenChange();
  const openAt = useCallback((path: string, line: number, column: number) => void openChange(path, line, column), [openChange]);

  // `?find=` and `?regex=1` prefill once, over the remembered options; `find` then stays in the URL.
  useEffect(() => {
    const param = readUrlParam(FIND_PARAM);
    if (param) {
      setFind(param);
      setPrefs((current) => ({ ...current, regex: readUrlParam(REGEX_PARAM) === "1" }));
    }
    setReady(true);
  }, [setPrefs]);
  useEffect(() => {
    if (ready) replaceUrlParam(FIND_PARAM, find || null);
  }, [ready, find]);
  // A replace made in another vault can't be undone here.
  const banner = lastReplace && lastReplace.vault === vaultHandle ? lastReplace : null;
  useEffect(() => {
    if (lastReplace && lastReplace.vault !== vaultHandle) setLastReplace(null);
  }, [lastReplace, vaultHandle, setLastReplace]);

  const applying = progress !== null;
  // Per-file outcomes show until the follow-up scan answers.
  const states = applied && (applied.key === preview.scanKey || !preview.done) ? applied.states : {};
  const count = selection.includedMatches;
  const blocked = applying || !preview.done || preview.capped || preview.invalid || preview.stalled || count === 0;
  const label = progress
    ? `Replacing… ${formatCount(progress.done)} of ${formatCount(progress.total)}`
    : count === 0
      ? "Replace"
      : `Replace ${formatCount(count, ["match", "matches"])} in ${formatCount(selection.includedFiles, ["file", "files"])}`;

  const onReplace = async () => {
    const plan = sorted
      .map((file) => ({ file, skip: selection.excluded.get(file.path) ?? new Set<number>() }))
      .filter(({ file, skip }) => file.matches.length > skip.size);
    const key = preview.scanKey;
    const pending: FileStates = {};
    for (const { file, skip } of plan) pending[file.path] = { state: "replacing", count: file.matches.length - skip.size };
    setProgress({ done: 0, total: plan.length });
    setApplied({ key, states: pending });
    const outcome = await apply(
      { query, template: replaceWith, files: plan.map(({ file, skip }) => ({ path: file.path, fingerprint: file.fingerprint, skip })) },
      (step) => setProgress({ done: step.done, total: step.total }),
    );
    const finished: FileStates = {};
    for (const [path, entry] of Object.entries(pending)) finished[path] = { ...entry, state: outcome.results[path] ?? "failed" };
    setApplied({ key, states: finished });
    setProgress(null);
    preview.refresh();
  };

  const onUndo = async () => {
    if (!lastReplace) return;
    setUndoing(true);
    await undo(lastReplace);
    setUndoing(false);
    preview.refresh();
  };

  let body;
  if (!vaultHandle) body = <p className={NOTE}>Open a vault to replace text in its files.</p>;
  else if (isPending) body = <p className={NOTE}>Allow access to the vault&apos;s folder to replace text in it.</p>;
  else if (!available) body = <p className={NOTE}>Replace in Files isn&apos;t available in this browser.</p>;
  else if (files.length === 0) body = <p className={NOTE}>No files to search.</p>;
  else {
    body = (
      <>
        <ReplaceForm
          find={find}
          replaceWith={replaceWith}
          prefs={prefs}
          onFind={setFind}
          onReplaceWith={setReplaceWith}
          onPrefs={setPrefs}
          label={label}
          disabled={blocked}
          busy={applying}
          onReplace={() => void onReplace()}
        />
        <ReplaceSummary
          searching={find !== ""}
          scanning={!!find && !preview.done}
          scanned={preview.scanned}
          total={preview.total}
          matchCount={preview.matchCount}
          fileCount={sorted.length}
          capped={preview.capped}
          invalid={preview.invalid}
          stalled={preview.stalled}
          hasPrivate={hasPrivate}
          banner={banner && { matches: banner.matches, files: banner.files.length }}
          onUndo={() => void onUndo()}
          undoing={undoing}
        />
        {find !== "" && preview.done && sorted.length === 0 && !preview.invalid && !preview.stalled && <p className={NOTE}>No matches.</p>}
        {!preview.invalid &&
          sorted.map((file) => (
            <ReplaceFileSection
              key={file.path}
              file={file}
              template={replaceWith}
              regex={prefs.regex}
              excluded={selection.excluded.get(file.path)}
              state={states[file.path]?.state}
              replacedCount={states[file.path]?.count}
              onToggleMatch={selection.toggleMatch}
              onToggleFile={selection.toggleFile}
              onOpen={openAt}
            />
          ))}
      </>
    );
  }

  return (
    <ShellPage title="Replace in Files" help={{ href: "/documentation#command-palette", label: "How to replace across files" }}>
      <LoadingBar isVisible={applying} label="Replacing" />
      <main className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
        <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-8 sm:px-8">{body}</div>
      </main>
    </ShellPage>
  );
}
