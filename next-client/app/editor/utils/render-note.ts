// Renders a (compiled) note to body HTML for the exports: Export as PDF
// (print-note.ts) and Export as HTML (html-export.ts). Mermaid diagrams
// become inline SVG and math MathML; vault images are read from the vault
// and handed to `imageUrl`, which picks how they're referenced (an object
// URL for printing, a data URL for a file that must stand alone).

import { resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { escapeHtml, noteToHtml, type PrintBlock } from "@/app/utils/print/note-html";
import { DEFAULT_PAGE_BREAK } from "@/app/utils/print/print-settings";
import { vaultImagePath } from "./note-embeds";
import { renderMermaid } from "./render-mermaid";
import { renderMathMl } from "./render-math";

const REGEX_IMAGE_SRC = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?/g;

async function renderBlock(block: PrintBlock): Promise<string> {
  try {
    return block.kind === "mermaid" ? await renderMermaid(block.source, "default") : await renderMathMl(block.source);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `<pre class="render-error">${escapeHtml(`${block.kind === "mermaid" ? "Diagram" : "Formula"} error: ${message}`)}\n\n${escapeHtml(block.source)}</pre>`;
  }
}

export interface RenderedNote {
  /** The note's first H1, if any. */
  title: string | null;
  body: string;
}

export async function renderNote(
  text: string,
  notePath: string,
  vaultHandle: FileSystemDirectoryHandle | null | undefined,
  imageUrl: (file: File) => Promise<string>,
  options: { openDetails?: boolean } = {},
): Promise<RenderedNote> {
  const images = new Map<string, string>();
  if (vaultHandle && notePath !== "draft") {
    for (const [, src] of text.matchAll(REGEX_IMAGE_SRC)) {
      const imagePath = vaultImagePath(notePath, src);
      if (!imagePath || images.has(src)) continue;
      try {
        const file = await (await resolveFileHandleAtPath(vaultHandle, imagePath)).getFile();
        images.set(src, await imageUrl(file));
      } catch {
        // Missing image: its alt text shows instead.
      }
    }
  }
  const result = noteToHtml(text, {
    imageSrc: (src) => images.get(src) ?? (/^(https?:|data:image\/)/i.test(src) ? src : null),
    pageBreak: DEFAULT_PAGE_BREAK,
    openDetails: options.openDetails,
  });
  const rendered = await Promise.all(result.blocks.map(renderBlock));
  const body = result.html.replace(/(<div class="rendered [a-z]+") data-render="(\d+)"><\/div>/g, (_whole, open: string, index: string) => `${open}>${rendered[Number(index)] ?? ""}</div>`);
  return { title: result.title ?? null, body };
}
