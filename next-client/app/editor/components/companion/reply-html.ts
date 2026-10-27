import { escapeHtml, noteToHtml } from "@/app/utils/print/note-html";

const REGEX_PLACEHOLDER = /<div class="rendered (?:mermaid|math)" data-render="(\d+)"><\/div>/g;

// A companion reply's Markdown as HTML for the thread, through the same
// renderer as note embeds and Export as PDF (noteToHtml): everything is
// escaped, raw HTML is dropped, wikilinks become spans and only web and mail
// links stay links. Images show their alt text (nothing loads from the
// web). Diagrams and display math aren't drawn in the panel;
// they show their source as a code block.
export function replyToHtml(markdown: string): string {
  const { html, blocks } = noteToHtml(markdown, { imageSrc: () => null });
  return html.replace(REGEX_PLACEHOLDER, (whole, index: string) => {
    const block = blocks[Number(index)];
    return block ? `<pre><code>${escapeHtml(block.source)}</code></pre>` : whole;
  });
}
