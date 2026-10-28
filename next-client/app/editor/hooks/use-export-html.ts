"use client";

import { useCallback, useEffect, useRef } from "react";
import { useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_activeFilePath, atom_content, atom_fileName } from "@/app/atoms/file-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useRegisterCommand } from "@/app/components/CommandPalette/CommandPaletteContext";
import { downloadText } from "@/app/utils/download-markdown";
import { isSvgPath } from "@/app/utils/file-kinds";
import { sanitizeSvgText } from "@/app/utils/sanitize-svg";
import { fileToDataUrl, htmlDocument, htmlFileName } from "../utils/html-export";
import { EXPORT_HTML_EVENT } from "../utils/open-helper-dialogs";
import { renderNote } from "../utils/render-note";
import { useCompileEmbeds } from "./use-embed-reader";
import { useExportDisabledReason } from "./use-export-pdf";

// Export as HTML: the focused note as one self-contained .html download
// (html-export.ts), rendered like Export as PDF with its embeds filled in
// and its vault images inlined. Never writes to the vault. Registers the
// palette command and answers the toolbar's More → Export as HTML event;
// a private note that's still veiled can't be exported until it's shown.
export function useExportHtml() {
  const store = useStore();
  const compileEmbeds = useCompileEmbeds();
  const disabledReason = useExportDisabledReason();
  const busy = useRef(false);

  const exportHtml = useCallback(async () => {
    if (busy.current) return;
    if (disabledReason) {
      toast.error(disabledReason);
      return;
    }
    busy.current = true;
    try {
      const notePath = store.get(atom_activeFilePath) ?? "draft";
      const text = await compileEmbeds(store.get(atom_content), notePath);
      const { title: h1, body } = await renderNote(text, notePath, store.get(atom_vaultHandle), async (file, path) => {
        if (isSvgPath(path)) {
          const clean = await sanitizeSvgText(file);
          if (!clean) throw new Error("SVG failed to sanitise");
          return fileToDataUrl(new File([clean], file.name, { type: "image/svg+xml" }));
        }
        return fileToDataUrl(file);
      });
      const fileName = store.get(atom_fileName);
      const title = h1 ?? (fileName || "Untitled").replace(/\.md$/i, "");
      const name = downloadText(htmlDocument(title, body), htmlFileName(fileName, title), "text/html");
      toast.success(`Downloaded ${name}`);
    } catch (err) {
      console.warn("Export as HTML failed:", err);
      toast.error("Couldn't export the note as HTML");
    } finally {
      busy.current = false;
    }
  }, [store, disabledReason, compileEmbeds]);

  useRegisterCommand({
    id: "export-html",
    label: "Export as HTML",
    category: "Document",
    keywords: "html web page export save share publish download standalone file",
    disabledReason,
    action: () => void exportHtml(),
  });

  const latest = useRef(exportHtml);
  latest.current = exportHtml;
  useEffect(() => {
    const handle = () => void latest.current();
    document.addEventListener(EXPORT_HTML_EVENT, handle);
    return () => document.removeEventListener(EXPORT_HTML_EVENT, handle);
  }, []);
}
