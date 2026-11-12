"use client";

import { useAtom, useAtomValue } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { atom_activeFilePath } from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_activeEditorView, atom_documentCheckOpen } from "@/app/atoms/ui-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import {
  checkDocument,
  createVaultFileExists,
  fixesAsChanges,
  type DocFix,
  type DocIssue,
} from "../utils/check-document";

// The palette's Check document: broken links, missing images and skipped
// headings in the open note, each with a Fix that is one ordinary edit (⌘Z
// takes it back). Without a vault, only what the note itself shows is checked.
export default function DocumentCheckDialog() {
  const [open, setOpen] = useAtom(atom_documentCheckOpen);
  if (!open) return null;
  return <DocumentCheck onClose={() => setOpen(false)} />;
}

type Result = { text: string; issues: DocIssue[] } | null;

function DocumentCheck({ onClose }: { onClose: () => void }) {
  const view = useAtomValue(atom_activeEditorView);
  const activePath = useAtomValue(atom_activeFilePath);
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const vault = useAtomValue(atom_vaultHandle);
  const [result, setResult] = useState<Result>(null);
  // Later checks win over earlier ones that finish after them.
  const latest = useRef(0);

  const run = useCallback(async () => {
    if (!view) return;
    const ticket = ++latest.current;
    const text = view.state.doc.toString();
    const issues = await checkDocument(text, {
      notePath: activePath && activePath !== "draft" ? activePath : null,
      fileMetadata,
      fileExists: vault ? createVaultFileExists(vault) : async () => true,
    });
    if (ticket === latest.current) setResult({ text, issues });
  }, [view, activePath, fileMetadata, vault]);

  useEffect(() => {
    void run();
  }, [run]);

  // The note moved on since the check: the list is stale, so check again
  // rather than edit at positions that no longer mean the same thing.
  const apply = (fixes: DocFix[], resolved: (issue: DocIssue) => boolean) => {
    if (!view || !result) return;
    if (view.state.doc.toString() !== result.text) {
      void run();
      return;
    }
    // The list answers at once; the check that follows confirms it.
    setResult({ ...result, issues: result.issues.filter((issue) => !resolved(issue)) });
    view.dispatch({
      changes: fixes.map(({ from, to, insert }) => ({ from, to, insert })),
      userEvent: "input.fix",
    });
    void run();
  };

  const goTo = (line: number) => {
    if (!view) return;
    const target = view.state.doc.line(Math.min(Math.max(line, 1), view.state.doc.lines));
    onClose();
    view.dispatch({ selection: { anchor: target.from }, scrollIntoView: true });
    view.focus();
  };

  const issues = result?.issues ?? [];
  const status = !view
    ? "Open a note first."
    : !result
      ? "Checking…"
      : issues.length === 0
        ? "No problems found."
        : `${issues.length} problem${issues.length === 1 ? "" : "s"} found.`;

  return (
    <DialogModal isOpened onClose={onClose} styles="max-w-2xl" ariaLabelledBy="document-check-title">
      <div className="space-y-4">
        <div>
          <h3 id="document-check-title" className="text-xl font-semibold">Check document</h3>
          <p className="text-ui-footnote text-fg-muted" role="status">{status}</p>
        </div>
        {issues.length > 0 && (
          <ul className="max-h-[50vh] space-y-2 overflow-auto" aria-label="Problems">
            {issues.map((issue) => (
              <li key={issue.id} className="flex items-start justify-between gap-3 rounded-lg bg-fill px-3 py-2">
                <div className="min-w-0">
                  <p className="text-ui-footnote text-fg">{issue.message}</p>
                  <Button variant="bare" className="text-fg-muted" onClick={() => goTo(issue.line)}>
                    Go to line {issue.line}
                  </Button>
                </div>
                <Button variant="secondary" className="shrink-0" onClick={() => apply([issue.fix], (other) => other.id === issue.id)}>
                  {issue.fix.label}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {issues.length > 1 && (
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => apply(fixesAsChanges(issues), () => true)}>
              Fix all {issues.length}
            </Button>
          </div>
        )}
      </div>
    </DialogModal>
  );
}
