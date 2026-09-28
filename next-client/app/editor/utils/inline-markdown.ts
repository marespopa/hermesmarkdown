// Tiny inline-Markdown → HTML renderer for table cells shown in the inline
// table editor. Cells are single-line, so this only covers the inline
// syntax people actually put in tables: code, bold, italic, strikethrough,
// links, images, wiki links and literal <br>. Everything is HTML-escaped
// first, so the only markup in the output is what this function emits.

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Allows web/mail links and relative paths; rejects javascript:, data: etc.
function safeUrl(url: string): string | null {
  const decoded = url.replace(/&amp;/g, "&");
  if (/^(https?:|mailto:)/i.test(decoded)) return url;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(decoded)) return url;
  return null;
}

function renderText(text: string): string {
  let html = escapeHtml(text);

  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (whole, alt: string, src: string) => {
    const url = safeUrl(src);
    return url ? `<img alt="${alt}" src="${url}">` : whole;
  });
  html = html.replace(/\[\[([^\]]+)\]\]/g, (_whole, name: string) => {
    const [target, label] = name.split("|");
    return `<span class="cm-table-wikilink" data-wikilink="${target.trim()}">${(label ?? target).trim()}</span>`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label: string, href: string) => {
    const url = safeUrl(href);
    return url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>` : whole;
  });
  html = html.replace(/\*\*(?=\S)(.+?)\*\*|__(?=\S)(.+?)__/g, (_w, a?: string, b?: string) => `<strong>${a ?? b}</strong>`);
  html = html.replace(/~~(?=\S)(.+?)~~/g, "<del>$1</del>");
  html = html.replace(/(^|[^*\w])\*(?=\S)([^*]+?)\*(?!\*)/g, "$1<em>$2</em>");
  html = html.replace(/(^|[^_\w])_(?=\S)([^_]+?)_(?![_\w])/g, "$1<em>$2</em>");
  html = html.replace(/&lt;br\s*\/?&gt;/gi, "<br>");
  return html;
}

export function renderInlineMarkdown(source: string): string {
  // Escaped pipes are a table-syntax detail; show them as plain pipes.
  const unescaped = source.replace(/\\\|/g, "|");
  return unescaped
    .split(/(`[^`]+`)/g)
    .map((part) =>
      part.length > 1 && part.startsWith("`") && part.endsWith("`")
        ? `<code>${escapeHtml(part.slice(1, -1))}</code>`
        : renderText(part),
    )
    .join("");
}
