"use client";

import React, { useEffect, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { atom_repurposeWizardOpen } from "@/app/atoms/ui-atoms";
import { atom_content, atom_fileName } from "@/app/atoms/file-atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { callAI } from "@/app/services/ai";
import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";
import { HiOutlineRefresh } from "react-icons/hi";

type Phase = "select" | "drafting" | "review";
type Format = "blog" | "social" | "newsletter";

const FORMAT_LABELS: Record<Format, string> = {
  blog: "Blog post",
  social: "Social post",
  newsletter: "Newsletter",
};

const FORMAT_PROMPTS: Record<Format, string> = {
  blog: `You are drafting a blog post from the source note below. Write a full-length post with a clear thesis, supporting points or examples drawn from the source material, and a concrete takeaway at the end. Do not invent facts not present in the source note — flag gaps instead of filling them with generic filler.

Structure: title, one-sentence hook, 2-4 body sections with subheadings, a short closing takeaway.

Return ONLY the drafted Markdown, no preamble or surrounding code fences.`,
  social: `You are drafting a single short social media post from the source note below. Pick the single most interesting idea — do not try to cover everything. Punchy, scroll-stopping opening line. No hashtags unless the source note explicitly calls for them.

Return ONLY the drafted post text, no preamble or surrounding code fences.`,
  newsletter: `You are drafting a newsletter issue from the source note below. Short, personal-feeling intro (1-2 sentences), then 2-3 scannable sections with short headers — each section should stand alone for a skimming reader. Close with a single clear next step or call to action.

Return ONLY the drafted Markdown, no preamble or surrounding code fences.`,
};

function slugify(name: string): string {
  return name
    .replace(/\.md$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "note";
}

export default function RepurposeNoteWizard() {
  const [isOpen, setIsOpen] = useAtom(atom_repurposeWizardOpen);
  const content = useAtomValue(atom_content);
  const fileName = useAtomValue(atom_fileName);
  const { createFile } = useFileSystem();

  const [phase, setPhase] = useState<Phase>("select");
  const [selected, setSelected] = useState<Set<Format>>(new Set(["blog"]));
  const [drafts, setDrafts] = useState<Partial<Record<Format, string>>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPhase("select");
    setSelected(new Set(["blog"]));
    setDrafts({});
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleFormat = (format: Format) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(format)) next.delete(format);
      else next.add(format);
      return next;
    });
  };

  const handleClose = () => setIsOpen(false);

  const handleDraft = async () => {
    if (!content.trim() || selected.size === 0) return;
    setPhase("drafting");
    try {
      const formats = Array.from(selected);
      const results = await Promise.all(
        formats.map(async (format) => {
          const result = await callAI(FORMAT_PROMPTS[format], `Source note:\n${content}`);
          return [format, result.trim()] as const;
        }),
      );
      setDrafts(Object.fromEntries(results));
      setPhase("review");
    } catch (error: any) {
      showErrorToast(error.message || "Failed to draft from this note.");
      setPhase("select");
    }
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      const slug = slugify(fileName || "note");
      const formats = Array.from(selected);
      for (const format of formats) {
        const draft = drafts[format];
        if (!draft?.trim()) continue;
        const title = `${fileName || "note"} — ${FORMAT_LABELS[format]}`;
        const fm = `---\ntitle: "${title}"\nstatus: draft\ntags: [${format}]\n---\n\n`;
        await createFile(`${slug}-${format}`, fm + draft.trim() + "\n");
      }
      showSuccessToast(
        `Draft${formats.length > 1 ? "s" : ""} created (${formats.length} file${formats.length > 1 ? "s" : ""}).`,
      );
      setIsOpen(false);
    } catch (error: any) {
      showErrorToast(error.message || "Failed to save drafts.");
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
      ariaLabelledBy="repurpose-wizard-heading"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1 pr-8">
          <h2 id="repurpose-wizard-heading" className="text-ui-body font-semibold text-ink-light dark:text-ink-dark">
            Repurpose this note
          </h2>
          <p className="text-ui-footnote text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {phase === "select" && "Pick one or more formats. The AI drafts each into a new file — the current note is never modified."}
            {phase === "drafting" && "Drafting selected formats…"}
            {phase === "review" && "Review and edit each draft before saving. Nothing is written until you confirm."}
          </p>
        </div>

        {!content.trim() && (
          <p className="text-ui-caption text-stone bg-paper-softgray dark:bg-paper-dark/30 px-3 py-2 rounded-lg border border-beige dark:border-clay">
            This note is empty — write something first.
          </p>
        )}

        {phase === "select" && content.trim() && (
          <>
            <div className="flex flex-col gap-1 border border-beige dark:border-clay rounded-xl p-1">
              {(Object.keys(FORMAT_LABELS) as Format[]).map((format) => (
                <label
                  key={format}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-paper-softgray dark:hover:bg-paper-dark/40 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(format)}
                    onChange={() => toggleFormat(format)}
                    className="accent-sage"
                  />
                  <span className="text-ui-footnote text-ink-light dark:text-ink-dark">{FORMAT_LABELS[format]}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <Button variant="outlined" onClick={handleClose}>Cancel</Button>
              <Button variant="primary" disabled={selected.size === 0} onClick={handleDraft}>
                Draft {selected.size} format{selected.size !== 1 ? "s" : ""}
              </Button>
            </div>
          </>
        )}

        {phase === "drafting" && (
          <div className="flex items-center gap-3 py-4">
            <HiOutlineRefresh size={18} className="animate-spin text-stone shrink-0" />
            <span className="text-ui-footnote text-stone">Drafting…</span>
          </div>
        )}

        {phase === "review" && (
          <>
            <div className="flex flex-col gap-4 max-h-96 overflow-y-auto custom-scrollbar pr-1">
              {Array.from(selected).map((format) => (
                <div key={format} className="flex flex-col gap-1">
                  <span className="text-ui-caption font-semibold text-ink-light dark:text-ink-dark">
                    {FORMAT_LABELS[format]}
                  </span>
                  <textarea
                    value={drafts[format] ?? ""}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [format]: e.target.value }))}
                    rows={8}
                    className="w-full rounded-xl border border-beige dark:border-clay bg-paper-softgray dark:bg-paper-dark-surface/50 text-ink-light dark:text-ink-dark text-ui-footnote font-mono p-3 outline-none focus:ring-2 focus:ring-sage/15 dark:focus:ring-sage/20"
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <Button variant="outlined" onClick={() => setPhase("select")}>Back</Button>
              <Button variant="primary" disabled={isSaving} onClick={handleConfirm}>
                {isSaving ? "Saving…" : "Save draft(s)"}
              </Button>
            </div>
          </>
        )}
      </div>
    </DialogModal>
  );
}
