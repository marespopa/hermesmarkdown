// @vitest-environment node
import { describe, expect, it } from "vitest";
import { noteToHtml } from "./note-html";

const html = (markdown: string, imageSrc?: (src: string) => string | null) => noteToHtml(markdown, { imageSrc }).html;

describe("noteToHtml", () => {
  it("renders headings, inline formatting and paragraphs", () => {
    expect(html("# Release *notes*\n\nShipped **billing** with ~~old~~ `api` code.")).toBe(
      "<h1>Release <em>notes</em></h1>\n<p>Shipped <strong>billing</strong> with <del>old</del> <code>api</code> code.</p>",
    );
  });

  it("leaves out frontmatter and takes the title from the first H1", () => {
    const result = noteToHtml("---\ntitle: x\nprivate: false\n---\n# Q4 [[2026-Q4|review]]\n\nBody");
    expect(result.html).not.toContain("title: x");
    expect(result.title).toBe("Q4 review");
    expect(noteToHtml("Just text").title).toBeNull();
  });

  it("escapes HTML and drops raw HTML and comments, including rollup markers", () => {
    const out = html("<!-- rollup:start · Refresh rollup rewrites everything down to rollup:end -->\nA <b>bold</b> & <script>x</script> line\n<!-- rollup:end -->");
    expect(out).not.toContain("rollup:");
    expect(out).not.toContain("<b>");
    expect(out).not.toContain("<script>");
    expect(out).toContain("&amp;");
  });

  it("prints wikilinks as their text", () => {
    expect(html("See [[2026-10-06]] and [[Pricing plan|pricing]].")).toBe(
      '<p>See <span class="wikilink">2026-10-06</span> and <span class="wikilink">pricing</span>.</p>',
    );
  });

  it("keeps only web and mail links", () => {
    expect(html("[docs](https://example.com) [x](javascript:alert(1)) [note](other.md)")).toBe(
      '<p><a href="https://example.com">docs</a> x note</p>',
    );
  });

  it("renders task lists with checked and open boxes, and nested lists", () => {
    const out = html("- [x] Fix export button #bug\n- [ ] Ship pricing page\n  1. Draft\n  2. Review");
    expect(out).toContain('<li class="task"><span class="task-box done" aria-hidden="true">✓</span>Fix export button #bug');
    expect(out).toContain('<span class="task-box" aria-hidden="true"></span>Ship pricing page');
    expect(out).toContain("<ol><li><p>Draft</p></li><li><p>Review</p></li></ol>");
  });

  it("renders tables with a header row", () => {
    expect(html("| Metric | Value |\n|---|---|\n| Shipped | **3** |")).toBe(
      "<table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody><tr><td>Shipped</td><td><strong>3</strong></td></tr></tbody></table>",
    );
  });

  it("prints callouts expanded, with their title", () => {
    const out = html("> [!success]- #bug · 2\n> - Fix login redirect\n> - Fix crash on save");
    expect(out).toContain('<div class="callout callout-success"><div class="callout-title">#bug · 2</div>');
    expect(out).toContain("<li><p>Fix login redirect</p></li>");
    expect(html("> [!warning]\n> Careful")).toContain('<div class="callout-title">Warning</div>');
    expect(html("> Plain quote")).toBe("<blockquote><p>Plain quote</p></blockquote>");
  });

  it("escapes code blocks and defers Mermaid and math", () => {
    const result = noteToHtml("```ts\nconst a = 1 < 2;\n```\n\n```mermaid\ngraph TD; A-->B\n```\n\n$$\nx^2\n$$");
    expect(result.html).toContain("<pre><code>const a = 1 &lt; 2;</code></pre>");
    expect(result.blocks).toEqual([
      { kind: "mermaid", source: "graph TD; A-->B" },
      { kind: "math", source: "x^2" },
    ]);
    expect(result.html).toContain('<div class="rendered mermaid" data-render="0"></div>');
    expect(result.html).toContain('<div class="rendered math" data-render="1"></div>');
  });

  it("resolves images through imageSrc, else prints the alt text", () => {
    expect(html("![chart](assets/chart.png)", (src) => (src === "assets/chart.png" ? "blob:chart" : null))).toBe(
      '<p><img src="blob:chart" alt="chart"></p>',
    );
    expect(html("![chart](assets/chart.png)")).toBe('<p><span class="image-alt">[chart]</span></p>');
  });

  it("breaks pages at a top-level line that is exactly the marker", () => {
    const comment = noteToHtml("One\n\n<!-- pagebreak -->\n\nTwo", { pageBreak: "<!-- pagebreak -->" }).html;
    expect(comment).toBe('<p>One</p>\n<div class="page-break"></div>\n<p>Two</p>');
    expect(noteToHtml("One\n\n---\n\nTwo", { pageBreak: "---" }).html).toContain('<div class="page-break"></div>');
    expect(noteToHtml("One\n\n\\newpage\n\nTwo", { pageBreak: "\\newpage" }).html).toContain('<div class="page-break"></div>');
    // Inside a quote, in a sentence, or without a marker set, it's not a break.
    expect(noteToHtml("> ---\n\nA --- in text", { pageBreak: "---" }).html).not.toContain("page-break");
    expect(noteToHtml("One\n\n<!-- pagebreak -->\n\nTwo").html).not.toContain("page-break");
  });

  describe("<details> sections", () => {
    const note = "<details>\n<summary>Release notes</summary>\n\nBody in **Markdown**.\n\n</details>";

    it("renders a section with its body as Markdown, closed unless the note says open", () => {
      expect(html(note)).toBe("<details><summary>Release notes</summary><p>Body in <strong>Markdown</strong>.</p></details>");
      expect(html(note.replace("<details>", "<details open>"))).toContain("<details open><summary>");
    });

    it("opens every section with openDetails", () => {
      expect(noteToHtml(note, { openDetails: true }).html).toContain("<details open><summary>Release notes</summary>");
    });

    it("falls back to 'Details' without a summary", () => {
      expect(html("<details>\n\nBody\n\n</details>")).toBe("<details><summary>Details</summary><p>Body</p></details>");
    });

    it("escapes the summary", () => {
      expect(html("<details><summary><img src=x onerror=alert(1)></summary>x</details>")).not.toContain("<img");
      expect(html("<details><summary>a &lt; b</summary>x</details>")).toContain("<summary>a &lt; b</summary>");
    });

    it("nests sections and keeps the text around them", () => {
      const out = html("Before\n\n<details><summary>Outer</summary>\n\n<details><summary>Inner</summary>\n\nDeep\n\n</details>\n\n</details>\n\nAfter");
      expect(out).toContain("<details><summary>Outer</summary><details><summary>Inner</summary><p>Deep</p></details></details>");
      expect(out.startsWith("<p>Before</p>")).toBe(true);
      expect(out.endsWith("<p>After</p>")).toBe(true);
    });

    it("still drops other raw HTML and keeps page breaks before a section", () => {
      expect(html("<div>hi</div>\n\n" + note)).not.toContain("<div>");
      const out = noteToHtml("One\n\n<!-- pagebreak -->\n\n" + note, { pageBreak: "<!-- pagebreak -->" }).html;
      expect(out).toContain('<div class="page-break"></div>');
      expect(out).toContain("<details>");
    });
  });
});
