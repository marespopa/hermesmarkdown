"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue, useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_activeFilePath, atom_content, atom_fileName } from "@/app/atoms/file-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_revealAllPrivate, atom_revealedPrivatePaths } from "@/app/atoms/privacy-atoms";
import { atom_vaultHandle, resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { useRegisterCommand } from "@/app/components/CommandPalette/CommandPaletteContext";
import { isPrivateContent, isPrivateFrontmatter } from "@/app/utils/note-privacy";
import { escapeHtml, noteToHtml, type PrintBlock } from "@/app/utils/print/note-html";
import { printDate, printSettingsFrom, type PrintSettings } from "@/app/utils/print/print-settings";
import { EXPORT_PDF_EVENT } from "../utils/open-helper-dialogs";
import { vaultImagePath } from "../utils/note-embeds";
import { useCompileEmbeds } from "./use-embed-reader";
import { printDocument, printHtml } from "../utils/print-note";
import { renderMermaid } from "../utils/render-mermaid";
import { renderMathMl } from "../utils/render-math";

export const VEILED_REASON = "Show the note first: it's marked private";

const REGEX_IMAGE_SRC = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?/g;

// Moved to utils/note-embeds.ts; kept here for existing imports.
export { vaultImagePath };

async function renderBlock(block: PrintBlock): Promise<string> {
  try {
    return block.kind === "mermaid" ? await renderMermaid(block.source, "default") : await renderMathMl(block.source);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `<pre class="render-error">${escapeHtml(`${block.kind === "mermaid" ? "Diagram" : "Formula"} error: ${message}`)}\n\n${escapeHtml(block.source)}</pre>`;
  }
}

// A rendered note waiting in the export dialog. `urls` are its images'
// object URLs, revoked once it's printed or the dialog closes.
export interface PdfJob {
  title: string;
  body: string;
  settings: PrintSettings;
  date: string;
  urls: string[];
}

const revoke = (urls: string[]) => urls.forEach((url) => URL.revokeObjectURL(url));

// Export as PDF: the focused note, rendered with its frontmatter's page setup
// (print-settings.ts) and shown in the export dialog; printing goes through
// the browser's print dialog (Save as PDF), all on the device. Registers the
// palette command and answers the toolbar's More → Export as PDF… event. A
// private note that's still veiled can't be exported until it's shown.
export function useExportPdf() {
  const store = useStore();
  const content = useAtomValue(atom_content);
  const activeFilePath = useAtomValue(atom_activeFilePath);
  const metadata = useAtomValue(atom_fileMetadata);
  const revealAll = useAtomValue(atom_revealAllPrivate);
  const revealed = useAtomValue(atom_revealedPrivatePaths);
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

  const path = activeFilePath ?? "draft";
  const isPrivate = isPrivateContent(content) || isPrivateFrontmatter(metadata[path]?.frontmatter);
  const veiled = isPrivate && !revealAll && !revealed.has(path);
  const disabledReason = !content.trim() ? "The note is empty" : veiled ? VEILED_REASON : undefined;

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
      const vaultHandle = store.get(atom_vaultHandle);
      const images = new Map<string, string>();
      if (vaultHandle && notePath !== "draft") {
        for (const [, src] of text.matchAll(REGEX_IMAGE_SRC)) {
          const imagePath = vaultImagePath(notePath, src);
          if (!imagePath || images.has(src)) continue;
          try {
            const file = await (await resolveFileHandleAtPath(vaultHandle, imagePath)).getFile();
            const url = URL.createObjectURL(file);
            urls.push(url);
            images.set(src, url);
          } catch {
            // Missing image: its alt text prints instead.
          }
        }
      }
      const settings = printSettingsFrom(text);
      const result = noteToHtml(text, {
        imageSrc: (src) => images.get(src) ?? (/^(https?:|data:image\/)/i.test(src) ? src : null),
        pageBreak: settings.pageBreak,
      });
      const rendered = await Promise.all(result.blocks.map(renderBlock));
      const body = result.html.replace(/(<div class="rendered [a-z]+") data-render="(\d+)"><\/div>/g, (_whole, open: string, index: string) => `${open}>${rendered[Number(index)] ?? ""}</div>`);
      const title = result.title ?? (store.get(atom_fileName) || "Untitled").replace(/\.md$/i, "");
      setJob({ title, body, settings, date: printDate(), urls });
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
      await printHtml(printDocument(job.title, job.body, job.settings, job.date), () => revoke(job.urls));
    } catch (err) {
      console.warn("Export as PDF failed:", err);
      revoke(job.urls);
      toast.error("Couldn't export the note as PDF");
    }
  }, [job, setJob]);

  useRegisterCommand({
    id: "export-pdf",
    label: "Export as PDF…",
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
