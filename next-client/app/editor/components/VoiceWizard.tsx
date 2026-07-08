"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { atom_voiceWizardOpen, atom_isAiConfigured } from "@/app/atoms/ui-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_isDriveVault, atom_driveVaultId } from "@/app/atoms/drive-atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import { useDialog } from "@/app/hooks/use-dialog";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { callAI } from "@/app/services/ai";
import { writeHermesFile, readDriveHermesFile, writeDriveHermesFile } from "@/app/services/vault-schema";
import { DriveFileHandle } from "@/app/services/drive/DriveFileHandle";
import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";
import { HiOutlineRefresh, HiOutlineDocumentText } from "react-icons/hi";

type Phase = "select" | "drafting" | "review";

const VOICE_SYSTEM_PROMPT = `You draft a short "voice guide" note for a writer, based on excerpts from their own existing notes. Infer their audience, tone, recurring themes, and anything they seem to avoid — from evidence in the excerpts, not generic advice.

Return ONLY a Markdown document with exactly these four sections, in this order:

## Audience
## Tone
## Recurring themes
## Avoid

Each section: 2-5 short bullet points. No preamble, no explanation, no surrounding code fences.`;

async function readExistingVoiceMd(vaultHandle: FileSystemDirectoryHandle): Promise<string | null> {
  try {
    const hermesDir = await vaultHandle.getDirectoryHandle(".hermes");
    const fileHandle = await hermesDir.getFileHandle("voice.md");
    const file = await fileHandle.getFile();
    const text = (await file.text()).trim();
    return text || null;
  } catch {
    return null;
  }
}

export default function VoiceWizard() {
  const [isOpen, setIsOpen] = useAtom(atom_voiceWizardOpen);
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const isDriveVault = useAtomValue(atom_isDriveVault);
  const driveVaultId = useAtomValue(atom_driveVaultId);
  const dialog = useDialog();
  const { openFile } = useFileSystem();

  const [phase, setPhase] = useState<Phase>("select");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const candidates = useMemo(
    () =>
      Object.values(fileMetadata)
        .filter((m: any) => m.path && m.path.endsWith(".md") && !m.path.startsWith(".hermes/"))
        .sort((a: any, b: any) => a.path.localeCompare(b.path)),
    [fileMetadata],
  );

  useEffect(() => {
    if (!isOpen) return;
    setPhase("select");
    setSelected(new Set());
    setDraft("");
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSelected = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleClose = () => setIsOpen(false);

  const handleDraft = async () => {
    if (!vaultHandle || selected.size === 0) return;
    setPhase("drafting");
    try {
      const files = candidates.filter((m: any) => selected.has(m.path));
      const excerpts = await Promise.all(
        files.map(async (m: any) => {
          try {
            const file = await m.handle.getFile();
            const text: string = await file.text();
            return `--- ${m.path} ---\n${text.slice(0, 2000)}`;
          } catch {
            return null;
          }
        }),
      );
      const prompt = excerpts.filter(Boolean).join("\n\n");
      const result = await callAI(VOICE_SYSTEM_PROMPT, prompt);
      setDraft(result.trim());
      setPhase("review");
    } catch (error: any) {
      showErrorToast(error.message || "Failed to draft voice.md.");
      setPhase("select");
    }
  };

  const handleConfirm = async () => {
    if (!draft.trim()) return;
    if (isDriveVault ? !driveVaultId : !vaultHandle) return;
    setIsSaving(true);
    try {
      const existing = isDriveVault && driveVaultId
        ? await readDriveHermesFile(driveVaultId, "voice.md")
        : await readExistingVoiceMd(vaultHandle!);
      if (existing) {
        const confirmed = await dialog.confirm(
          ".hermes/voice.md already exists. Overwrite it with this draft?",
          "Overwrite voice.md?",
          "Overwrite",
          "Cancel",
        );
        if (!confirmed) {
          setIsSaving(false);
          return;
        }
      }

      const content = `${draft.trim()}\n`;
      if (isDriveVault && driveVaultId) {
        const driveFile = await writeDriveHermesFile(driveVaultId, "voice.md", content);
        const fileHandle = new DriveFileHandle("voice.md", driveFile.id);
        await openFile(fileHandle as any, ".hermes/voice.md", true);
      } else {
        await writeHermesFile(vaultHandle!, "voice.md", content);
        const hermesDir = await vaultHandle!.getDirectoryHandle(".hermes");
        const fileHandle = await hermesDir.getFileHandle("voice.md");
        await openFile(fileHandle, ".hermes/voice.md", true);
      }

      showSuccessToast("voice.md saved.");
      setIsOpen(false);
    } catch (error: any) {
      showErrorToast(error.message || "Failed to save voice.md.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogModal
      isOpened={isOpen}
      onClose={handleClose}
      onConfirm={phase === "review" ? handleConfirm : undefined}
      styles="sm:!max-w-md"
      mobileSheet
      ariaLabelledBy="voice-wizard-heading"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1 pr-8">
          <h2 id="voice-wizard-heading" className="text-ui-body font-semibold text-ink-light dark:text-ink-dark">
            Draft voice.md from notes
          </h2>
          <p className="text-ui-footnote text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {phase === "select" && "Pick a few notes that represent how you write. The AI reads them once to draft a voice guide — nothing is saved until you review and confirm."}
            {phase === "drafting" && "Reading selected notes and drafting…"}
            {phase === "review" && "Review and edit before saving. Nothing is written until you confirm."}
          </p>
        </div>

        {!isAiConfigured && (
          <p className="text-ui-caption text-stone bg-paper-softgray dark:bg-paper-dark/30 px-3 py-2 rounded-lg border border-beige dark:border-clay">
            Add an API key in Settings → AI Features first.
          </p>
        )}

        {phase === "select" && isAiConfigured && (
          <>
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto custom-scrollbar border border-beige dark:border-clay rounded-xl p-1">
              {candidates.length === 0 && (
                <p className="text-ui-caption text-stone px-3 py-4 text-center">No notes found in this vault yet.</p>
              )}
              {candidates.map((m: any) => (
                <label
                  key={m.path}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-paper-softgray dark:hover:bg-paper-dark/40 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(m.path)}
                    onChange={() => toggleSelected(m.path)}
                    className="accent-sage"
                  />
                  <HiOutlineDocumentText size={14} className="text-stone shrink-0" />
                  <span className="text-ui-footnote text-ink-light dark:text-ink-dark truncate">{m.path}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <Button variant="outlined" onClick={handleClose}>Cancel</Button>
              <Button variant="primary" disabled={selected.size === 0} onClick={handleDraft}>
                Draft from {selected.size} file{selected.size !== 1 ? "s" : ""}
              </Button>
            </div>
          </>
        )}

        {phase === "drafting" && (
          <div className="flex items-center gap-3 py-4">
            <HiOutlineRefresh size={18} className="animate-spin text-stone shrink-0" />
            <span className="text-ui-footnote text-stone">Drafting voice.md…</span>
          </div>
        )}

        {phase === "review" && (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={14}
              className="w-full rounded-xl border border-beige dark:border-clay bg-paper-softgray dark:bg-paper-dark-surface/50 text-ink-light dark:text-ink-dark text-ui-footnote font-mono p-3 outline-none focus:ring-2 focus:ring-sage/15 dark:focus:ring-sage/20"
            />
            <div className="flex items-center justify-between gap-2 pt-1">
              <Button variant="outlined" onClick={() => setPhase("select")}>Back</Button>
              <Button variant="primary" disabled={!draft.trim() || isSaving} onClick={handleConfirm}>
                {isSaving ? "Saving…" : "Save voice.md"}
              </Button>
            </div>
          </>
        )}
      </div>
    </DialogModal>
  );
}
