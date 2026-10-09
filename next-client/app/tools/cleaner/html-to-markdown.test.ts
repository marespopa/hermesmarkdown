import { describe, expect, it } from "vitest";
import { CLEANER_EXAMPLES } from "./cleaner-examples";
import { convertInput } from "./convert-input";
import { hasMarkdownStructure } from "./html-to-markdown";

// Through the whole pipeline, as the tool shows it.
const html = (source: string) => convertInput(source, "html").markdown;

describe("HTML to Markdown", () => {
  it("converts headings, emphasis and links", () => {
    expect(html('<h1>Title</h1><p>Some <strong>bold</strong>, <em>it</em> and a <a href="https://x.y">link</a>.</p>')).toBe(
      "# Title\n\nSome **bold**, *it* and a [link](https://x.y).\n",
    );
  });

  it("nests lists at the parent's content column", () => {
    expect(html("<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>")).toBe("- a\n  - b\n- c\n");
    expect(html("<ol><li>one</li><li>two</li></ol>")).toBe("1. one\n2. two\n");
  });

  it("turns a table without a header row into GFM, first row as header", () => {
    expect(html("<table><tr><td>Plan</td><td>Price</td></tr><tr><td>Free</td><td>0</td></tr></table>")).toBe(
      "| Plan | Price |\n| :--- | :---- |\n| Free | 0     |\n",
    );
  });

  it("escapes pipes and keeps line breaks inside cells", () => {
    expect(html("<table><tr><th>A</th></tr><tr><td>x | y<br>z</td></tr></table>")).toContain("x \\| y<br>z");
  });

  it("reads Google Docs bold and italic spans, without bolding the whole paste", () => {
    const doc = CLEANER_EXAMPLES.find((example) => example.id === "docs")!.text;
    const markdown = html(doc);
    expect(markdown).toContain("## Meeting summary");
    expect(markdown).toContain("**Decision:** launch on *Monday*.");
    expect(markdown).toMatch(/^- Update the pricing page$/m);
    expect(markdown).not.toMatch(/^\*\*Meeting/m);
  });

  it("rebuilds Word's list paragraphs as a list", () => {
    const word = [
      "<p class=MsoListParagraph style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>·<span>&nbsp;&nbsp;</span></span>First<o:p></o:p></p>",
      "<p class=MsoListParagraph style='mso-list:l0 level2 lfo1'><span style='mso-list:Ignore'>o<span>&nbsp;</span></span>Nested</p>",
      "<p class=MsoListParagraph style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>·<span>&nbsp;</span></span>Second</p>",
    ].join("");
    expect(html(word)).toBe("- First\n  - Nested\n- Second\n");
  });

  it("supports strikethrough, task lists and code", () => {
    expect(html("<p><del>old</del> new</p>")).toBe("~~old~~ new\n");
    expect(html('<ul><li><input type="checkbox" checked> done</li><li><input type="checkbox"> todo</li></ul>')).toBe(
      "- [x] done\n- [ ] todo\n",
    );
    expect(html('<pre><code class="language-bash">npm i my_package</code></pre>')).toBe("```bash\nnpm i my_package\n```\n");
    expect(html('<div class="highlight-source-js"><pre>let a = 1;</pre></div>')).toBe("```js\nlet a = 1;\n```\n");
  });

  it("keeps snake_case readable and drops scripts, styles and data: images", () => {
    expect(html("<p>call my_function now</p><script>alert(1)</script><style>p{}</style>")).toBe("call my_function now\n");
    expect(html('<p><img src="data:image/png;base64,AAAA" alt="Chart"></p>')).toBe("Chart\n");
  });

  it("doesn't keep script links", () => {
    expect(html('<p><a href="javascript:alert(1)">click</a></p>')).toBe("click\n");
  });
});

describe("hasMarkdownStructure", () => {
  it("is false for a code editor's coloured spans", () => {
    expect(hasMarkdownStructure('<div style="color:#d4d4d4"><div><span style="color:#569cd6">const</span> a</div></div>')).toBe(false);
    expect(hasMarkdownStructure("<meta charset='utf-8'><p>Hi</p>")).toBe(true);
  });
});
