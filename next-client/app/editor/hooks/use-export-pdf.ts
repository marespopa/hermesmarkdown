"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue, useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_activeFilePath, atom_content, atom_fileName } from "@/app/atoms/file-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_revealAllPrivate, atom_revealedPrivatePaths } from "@/app/atoms/privacy-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useRegisterCommand } from "@/app/components/CommandPalette/CommandPaletteContext";
import { isSvgPath } from "@/app/utils/file-kinds";
import { sanitizeSvg } from "@/app/utils/sanitize-svg";
import { isPrivateContent, isPrivateFrontmatter } from "@/app/utils/note-privacy";
import { printDate } from "@/app/utils/print/print-settings";
import { atom_pdfSettings } from "@/app/atoms/print-atoms";
import { EXPORT_PDF_EVENT } from "../utils/open-helper-dialogs";
import { vaultImagePath } from "../utils/note-embeds";
import { useCompileEmbeds } from "./use-embed-reader";
import { printDocument, printHtml } from "../utils/print-note";
import { renderNote } from "../utils/render-note";

export const VEILED_REASON = "Show the note first: it's marked private";

// Moved to utils/note-embeds.ts; kept here for existing imports.
export { vaultImagePath };

// Why the focused note can't be exported right now (empty, or private and
// still veiled), or undefined. Shared by Export as PDF and Export as HTML.
export function useExportDisabledReason(): string | undefined {
  const content = useAtomValue(atom_content);
  const activeFilePath = useAtomValue(atom_activeFilePath);
  const metadata = useAtomValue(atom_fileMetadata);
  const revealAll = useAtomValue(atom_revealAllPrivate);
  const revealed = useAtomValue(atom_revealedPrivatePaths);
  const path = activeFilePath ?? "draft";
  const isPrivate = isPrivateContent(content) || isPrivateFrontmatter(metadata[path]?.frontmatter);
  const veiled = isPrivate && !revealAll && !revealed.has(path);
  return !content.trim() ? "The note is empty" : veiled ? VEILED_REASON : undefined;
}

// A rendered note waiting in the export dialog. `urls` are its images'
// object URLs, revoked once it's printed or the dialog closes.
export interface PdfJob {
  title: string;
  body: string;
  date: string;
  urls: string[];
}

const revoke = (urls: string[]) => urls.forEach((url) => URL.revokeObjectURL(url));

// Export as PDF: the focused note, rendered and shown in the export dialog,
// where its page setup is chosen (atom_pdfSettings, print-settings.ts);
// printing goes through the browser's print dialog (Save as PDF), all on the
// device. Registers the
// palette command and answers the toolbar's More → Export as PDF event. A
// private note that's still veiled can't be exported until it's shown.
export function useExportPdf() {
  const store = useStore();
  const compileEmbeds = useCompileEmbeds();
  const busy = useRef(false);
  const [job, setJobState] = useState<PdfJob | null>(null);
  // The job on show, so a replaced or dropped one's images are let go.
  const shown = useRef<PdfJob | null>(null);
  const setJob = useCallback((next: PdfJob | null, release = true) => {
    if (release && shown.current && shown.current !== next) revoke(shown.current.urls);
    shown.current = next;
    setJobState(next);
  }, []);
  useEffect(() => () => {
    if (shown.current) revoke(shown.current.urls);
  }, []);

  const disabledReason = useExportDisabledReason();

  const exportPdf = useCallback(async () => {
    if (busy.current) return;
    if (disabledReason) {
      toast.error(disabledReason);
      return;
    }
    busy.current = true;
    const urls: string[] = [];
    try {
      const notePath = store.get(atom_activeFilePath) ?? "draft";
      // Embed lines print what they embed, nested embeds included; private
      // and unreadable files keep their lines.
      const text = await compileEmbeds(store.get(atom_content), notePath);
      const { title: h1, body } = await renderNote(text, notePath, store.get(atom_vaultHandle), async (file, path) => {
        if (isSvgPath(path)) {
          const url = await sanitizeSvg(file);
          if (!url) throw new Error("SVG failed to sanitise");
          urls.push(url);
          return url;
        }
        const url = URL.createObjectURL(file);
        urls.push(url);
        return url;
      }, { openDetails: true });
      const title = h1 ?? (store.get(atom_fileName) || "Untitled").replace(/\.md$/i, "");
      setJob({ title, body, date: printDate(), urls });
    } catch (err) {
      console.warn("Export as PDF failed:", err);
      revoke(urls);
      toast.error("Couldn't export the note as PDF");
    } finally {
      busy.current = false;
    }
  }, [store, disabledReason, setJob, compileEmbeds]);

  // Cancel: the dialog closes and the images are let go.
  const close = useCallback(() => setJob(null), [setJob]);

  // Save as PDF…: the dialog closes and the browser's print dialog opens;
  // the images are let go once it's done.
  const print = useCallback(async () => {
    if (!job) return;
    setJob(null, false);
    try {
      await printHtml(printDocument(job.title, job.body, store.get(atom_pdfSettings), job.date), () => revoke(job.urls));
    } catch (err) {
      console.warn("Export as PDF failed:", err);
      revoke(job.urls);
      toast.error("Couldn't export the note as PDF");
    }
  }, [job, setJob, store]);

  useRegisterCommand({
    id: "export-pdf",
    label: "Export as PDF",
    category: "Document",
    keywords: "pdf print export save share archive download",
    disabledReason,
    action: () => void exportPdf(),
  });

  const latest = useRef(exportPdf);
  latest.current = exportPdf;
  useEffect(() => {
    const handle = () => void latest.current();
    document.addEventListener(EXPORT_PDF_EVENT, handle);
    return () => document.removeEventListener(EXPORT_PDF_EVENT, handle);
  }, []);

  return { job, close, print };
}
