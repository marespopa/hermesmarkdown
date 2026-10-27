import { describe, expect, it } from "vitest";
import { replyToHtml } from "./reply-html";

describe("replyToHtml", () => {
  it("renders the reply's Markdown", () => {
    const html = replyToHtml("Changed **two** lines in [[Roadmap]]:\n\n- Launch\n- Pricing");

    expect(html).toContain("<strong>two</strong>");
    expect(html).toContain('<span class="wikilink">Roadmap</span>');
    expect(html).toMatch(/<ul>[\s\S]*<li>[\s\S]*Launch[\s\S]*<\/ul>/);
  });

  it("drops raw HTML", () => {
    expect(replyToHtml('Done <script>alert(1)</script> <img src=x onerror="x()">')).not.toMatch(/<script|<img/);
  });

  it("shows images as their alt text", () => {
    expect(replyToHtml("![chart](https://example.com/chart.png)")).not.toContain("<img");
  });

  it("shows a diagram's source as code", () => {
    const html = replyToHtml("```mermaid\ngraph TD; A-->B\n```");

    expect(html).toMatch(/<pre><code>graph TD; A--&gt;B\n?<\/code><\/pre>/);
    expect(html).not.toContain("data-render");
  });
});
