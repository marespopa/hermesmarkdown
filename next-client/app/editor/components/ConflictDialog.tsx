"use client";

import { useAtom, useSetAtom } from "jotai";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  atom_activeFileHandle,
  atom_activeFilePath,
  atom_content,
  atom_fileConflict,
  atom_fileLastModified,
  atom_lastSavedContent,
  atom_openFiles,
} from "@/app/atoms/atoms";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Textarea from "@/app/components/Input/Textarea.component";
import { useFileSystem } from "@/app/hooks/use-file-system";
import {
  countMergeConflicts,
  resolveMergeConflicts,
  threeWayMerge,
} from "../utils/three-way-merge";

export default function ConflictDialog() {
  const [activeFileHandle] = useAtom(atom_activeFileHandle);
  const [conflict, setConflict] = useAtom(atom_fileConflict);
  const [content, setContent] = useAtom(atom_content);
  const [lastSavedContent, setLastSavedContent] = useAtom(atom_lastSavedContent);
  const [, setFileLastModified] = useAtom(atom_fileLastModified);
  const [activePath] = useAtom(atom_activeFilePath);
  const setOpenFiles = useSetAtom(atom_openFiles);
  const { saveFile } = useFileSystem();
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [mergedText, setMergedText] = useState("");

  if (!conflict) return null;

  const startMerge = () => {
    setMergedText(threeWayMerge(lastSavedContent, content, conflict.remoteContent));
    setIsMergeOpen(true);
  };

  const reload = async () => {
    if (!activeFileHandle) return;
    try {
      const file = await activeFileHandle.getFile();
      const incoming = await file.text();
      setContent(incoming);
      setLastSavedContent(incoming);
      setFileLastModified(file.lastModified);
      setConflict(null);
      toast.success("Loaded incoming changes");
    } catch (error) {
      console.error("Failed to reload externally modified file:", error);
      toast.error("Failed to reload file");
    }
  };

  const keepCurrent = async () => {
    if (!activeFileHandle) return;
    try {
      const file = await activeFileHandle.getFile();
      setFileLastModified(file.lastModified);
      setConflict(null);
      toast.success("Kept current changes");
    } catch (error) {
      console.error("Failed to keep current changes:", error);
      toast.error("Failed to access file");
    }
  };

  const saveMerged = async () => {
    if (!activeFileHandle) return;
    if (countMergeConflicts(mergedText) > 0) {
      toast.error("Resolve every conflict before saving");
      return;
    }

    const saved = await saveFile(mergedText, activeFileHandle);
    if (!saved) return;

    setContent(mergedText);
    setLastSavedContent(mergedText);
    setConflict(null);
    setIsMergeOpen(false);
    if (activePath) {
      setOpenFiles((files) => ({
        ...files,
        [activePath]: { ...files[activePath], snapshots: [] },
      }));
    }
    toast.success("Merged changes saved");
  };

  const unresolvedCount = countMergeConflicts(mergedText);

  return (
    <DialogModal
      isOpened
      onClose={() => undefined}
      hideCloseButton
      styles="max-w-6xl"
      ariaLabelledBy="conflict-dialog-title"
    >
      <div className="space-y-4">
        <div>
          <h3 id="conflict-dialog-title" className="text-xl font-semibold">
            File changed on disk
          </h3>
          <p className="text-ui-footnote">
            Your current edits and incoming changes diverged. Choose a version or resolve both in the merge editor.
          </p>
        </div>

        {!isMergeOpen ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Button variant="secondary" onClick={reload} className="min-h-24 text-left">
              <span className="block font-bold">Accept Incoming</span>
              <span className="text-ui-footnote font-normal">Discard current edits and reload the file on disk.</span>
            </Button>
            <Button variant="secondary" onClick={keepCurrent} className="min-h-24 text-left">
              <span className="block font-bold">Keep Current</span>
              <span className="text-ui-footnote font-normal">Keep edits and overwrite the disk version on the next save.</span>
            </Button>
            <Button variant="primary" onClick={startMerge} className="min-h-24 text-left">
              <span className="block font-bold">Resolve in Merge Editor</span>
              <span className="text-ui-footnote font-normal">Review current, incoming, and merged result side by side.</span>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-3">
              <Preview label="Current change" content={content} />
              <Preview label="Incoming change" content={conflict.remoteContent} />
              <Preview label="Common base" content={lastSavedContent} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-ui-footnote">
                {unresolvedCount === 0 ? "All conflicts resolved" : `${unresolvedCount} unresolved conflict${unresolvedCount === 1 ? "" : "s"}`}
              </span>
              {unresolvedCount > 0 && (
                <>
                  <Button variant="tertiary" onClick={() => setMergedText((text) => resolveMergeConflicts(text, "current"))}>
                    Accept All Current
                  </Button>
                  <Button variant="tertiary" onClick={() => setMergedText((text) => resolveMergeConflicts(text, "incoming"))}>
                    Accept All Incoming
                  </Button>
                </>
              )}
            </div>
            <Textarea
              name="merged-content"
              label="Result"
              value={mergedText}
              handleChange={(event) => setMergedText(event.target.value)}
              className="font-mono"
              rows={16}
              spellCheck={false}
            />
            <div className="flex gap-2">
              <Button variant="primary" onClick={saveMerged} disabled={unresolvedCount > 0}>
                Complete Merge
              </Button>
              <Button variant="secondary" onClick={() => setIsMergeOpen(false)}>
                Back
              </Button>
            </div>
          </>
        )}
      </div>
    </DialogModal>
  );
}

function Preview({ label, content }: { label: string; content: string }) {
  return (
    <section aria-label={label} className="min-w-0 rounded-lg border border-edge-subtle">
      <h4 className="border-b border-edge-subtle px-3 py-2 text-sm font-semibold">{label}</h4>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words p-3 text-xs">{content}</pre>
    </section>
  );
}
