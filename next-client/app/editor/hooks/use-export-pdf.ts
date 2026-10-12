"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAtomValue, useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_activeFilePath, atom_content, atom_fileName } from "@/app/atoms/file-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_revealAllPrivate, atom_revealedPrivatePaths } from "@/app/atoms/privacy-atoms";
import { atom_vaultHandle, resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { useRegisterCommand } from "@/app/components/CommandPalette/CommandPaletteContext";
import { isPrivateContent, isPrivateFrontmatter } from "@/app/utils/note-privacy";
import { escapeHtml, noteToHtml, type PrintBlock } from "@/app/utils/print/note-html";
import { EXPORT_PDF_EVENT } from "../utils/open-helper-dialogs";
import { printDocument, printHtml } from "../utils/print-note";
import { renderMermaid } from "../utils/render-mermaid";
import { renderMathMl } from "../utils/render-math";

export const VEILED_REASON = "Show the note first: it's marked private";

const REGEX_IMAGE_SRC = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?/g;

// A vault image path for `src` relative to the note's folder: "../a.png"
// from "journal/2026/x.md" is "journal/a.png"; "/a.png" is from the vault root.
export function vaultImagePath(notePath: string, src: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(src);
  } catch {
    decoded = src;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(decoded)) return null;
  const parts = decoded.startsWith("/") ? [] : notePath.split("/").slice(0, -1);
  for (const segment of decoded.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (!parts.length) return null;
      parts.pop();
    } else {
      parts.push(segment);
    }
  }
  return parts.length ? parts.join("/") : null;
}

async function renderBlock(block: PrintBlock): Promise<string> {
  try {
    return block.kind === "mermaid" ? await renderMermaid(block.source, "default") : await renderMathMl(block.source);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `<pre class="render-error">${escapeHtml(`${block.kind === "mermaid" ? "Diagram" : "Formula"} error: ${message}`)}\n\n${escapeHtml(block.source)}</pre>`;
  }
}

// Export as PDF: the focused note, rendered and printed through the
// browser's print dialog (Save as PDF), all on the device. Registers the
// palette command and answers the toolbar's More → Export as PDF… event. A
// private note that's still veiled can't be exported until it's shown.
export function useExportPdf() {
  const store = useStore();
  const content = useAtomValue(atom_content);
  const activeFilePath = useAtomValue(atom_activeFilePath);
  const metadata = useAtomValue(atom_fileMetadata);
  const revealAll = useAtomValue(atom_revealAllPrivate);
  const revealed = useAtomValue(atom_revealedPrivatePaths);
  const busy = useRef(false);

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
      const text = store.get(atom_content);
      const notePath = store.get(atom_activeFilePath) ?? "draft";
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
      const result = noteToHtml(text, {
        imageSrc: (src) => images.get(src) ?? (/^(https?:|data:image\/)/i.test(src) ? src : null),
      });
      const rendered = await Promise.all(result.blocks.map(renderBlock));
      const body = result.html.replace(/(<div class="rendered [a-z]+") data-render="(\d+)"><\/div>/g, (_whole, open: string, index: string) => `${open}>${rendered[Number(index)] ?? ""}</div>`);
      const title = result.title ?? (store.get(atom_fileName) || "Untitled").replace(/\.md$/i, "");
      await printHtml(printDocument(title, body), () => urls.forEach((url) => URL.revokeObjectURL(url)));
    } catch (err) {
      console.warn("Export as PDF failed:", err);
      urls.forEach((url) => URL.revokeObjectURL(url));
      toast.error("Couldn't export the note as PDF");
    } finally {
      busy.current = false;
    }
  }, [store, disabledReason]);

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
}
