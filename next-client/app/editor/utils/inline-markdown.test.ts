import { describe, expect, it } from "vitest";
import { renderInlineMarkdown } from "./inline-markdown";

describe("renderInlineMarkdown", () => {
  it("renders the inline syntax used in table cells", () => {
    expect(renderInlineMarkdown("**bold** and *em* and ~~gone~~")).toBe(
      "<strong>bold</strong> and <em>em</em> and <del>gone</del>",
    );
    expect(renderInlineMarkdown("`a|b`")).toBe("<code>a|b</code>");
    expect(renderInlineMarkdown("[site](https://example.com)")).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">site</a>',
    );
  });

  it("escapes HTML and refuses script URLs", () => {
    expect(renderInlineMarkdown("<b>x</b>")).toBe("&lt;b&gt;x&lt;/b&gt;");
    expect(renderInlineMarkdown("[x](javascript:alert(1))")).not.toContain("<a");
  });

  it("shows escaped pipes as plain pipes", () => {
    expect(renderInlineMarkdown("a\\|b")).toBe("a|b");
  });
});
