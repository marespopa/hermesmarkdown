// Export as HTML: one self-contained .html file per note. It reuses the PDF
// export's rendering (render-note.ts) and its stylesheet, so both exports
// look alike, set as a reading column on screen. Images are inlined as data
// URLs, diagrams as SVG and math as MathML: the file needs nothing else,
// opens offline and fetches nothing, apart from images the note itself
// links to on the web.

import { escapeHtml } from "@/app/utils/print/note-html";
import { PRINT_CSS } from "./print-note";

// On screen: a centred column in reading sizes, light or dark with the
// reader's system. Printing the file falls back to PRINT_CSS as it is.
export const HTML_EXPORT_CSS = `
@media screen {
  body { max-width: 44rem; margin: 0 auto; padding: 3rem 1.25rem 5rem; font-size: 17px; line-height: 1.6; }
  h1 { font-size: 2rem; } h2 { font-size: 1.45rem; } h3 { font-size: 1.2rem; }
  code, pre { font-size: 0.85em; }
}
@media screen and (prefers-color-scheme: dark) {
  html { color: #ece7e0; background: #211e1b; }
  h2, hr, pre, th, td, .callout, details { border-color: #3d3833; }
  pre, th { background: #2a2622; }
  code { background: #2a2622; }
  blockquote { border-left-color: #4a443d; color: #a8a199; }
  a { color: #64a8ff; }
  .wikilink { color: #8fa7c6; }
  .image-alt { color: #948f87; }
  .rendered svg { background: #fff; border-radius: 6px; padding: 0.5rem; }
}
`;

export function htmlDocument(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="HermesMarkdown">
<title>${escapeHtml(title)}</title>
<style>${PRINT_CSS}${HTML_EXPORT_CSS}</style>
</head>
<body>
${body}
</body>
</html>
`;
}

// The note's file name with .html in place of .md; a draft is named from
// its title.
export function htmlFileName(fileName: string, title: string): string {
  const base = fileName.trim().replace(/\.(md|markdown)$/i, "") || title.replace(/[\\/:*?"<>|]+/g, "").trim() || "untitled";
  return `${base}.html`;
}

// A file's contents as a data: URL.
export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
