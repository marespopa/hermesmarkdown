// "Download as Markdown": hands the note to the browser as a .md download.
// It never writes to the vault or changes the note's saved state.

// The note's file name with a .md extension; a draft without one is named
// from its first line, or "untitled".
export function markdownFileName(fileName: string, content: string): string {
  const baseName =
    fileName.trim() ||
    content
      .split("\n")[0]
      .replace(/[^\w\s]/gi, "")
      .slice(0, 20)
      .trim() ||
    "untitled";
  return baseName.toLowerCase().endsWith(".md") ? baseName : `${baseName}.md`;
}

// Starts the download; returns the file name used.
export function downloadMarkdown(content: string, fileName: string): string {
  return downloadText(content, markdownFileName(fileName, content), "text/markdown");
}

// Hands `content` to the browser as a download named `name`; returns it.
export function downloadText(content: string, name: string, type: string): string {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
  return name;
}
