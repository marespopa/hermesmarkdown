// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_PRINT_SETTINGS } from "@/app/utils/print/print-settings";
import { pageCss, printDocument } from "./print-note";
import { marginSides, previewDocument } from "./print-preview";

const settings = { ...DEFAULT_PRINT_SETTINGS, header: "{title} | {date}", footer: "{page} / {pages}" };

describe("pageCss", () => {
  it("sets the page size and margins, and prints the header and footer in the page margins", () => {
    const css = pageCss(settings, { title: "Q4 review", date: "2026-10-13" });
    expect(css).toContain("size: A4; margin: 18mm 16mm;");
    expect(css).toContain('@top-left { content: "Q4 review";');
    expect(css).toContain('@top-right { content: "2026-10-13";');
    expect(css).toContain('@bottom-center { content: counter(page) " / " counter(pages);');
  });

  it("leaves the margin boxes out without a header or footer", () => {
    expect(pageCss(DEFAULT_PRINT_SETTINGS, { title: "x" })).toBe("@page { size: A4; margin: 18mm 16mm;   }");
  });

  it("prints rules as page breaks only with New page at each rule on", () => {
    expect(printDocument("x", "<hr>", DEFAULT_PRINT_SETTINGS)).toContain("<body><hr></body>");
    expect(printDocument("x", "<hr>", { ...DEFAULT_PRINT_SETTINGS, breakAtRules: true })).toContain('<body><div class="page-break"></div></body>');
  });

  it("keeps a title from ending the style element or the CSS string", () => {
    const html = printDocument('Notes </style><script>alert(1)</script> "quoted"', "<p>x</p>", { ...DEFAULT_PRINT_SETTINGS, header: "{title}" });
    expect(html).not.toContain("</style><script>");
    expect(html).toContain('\\3c /style>');
    expect(html).toContain('\\"quoted\\"');
  });
});

describe("previewDocument", () => {
  it("lays each page-break section out as a numbered sheet", () => {
    const html = previewDocument("Q4 review", '<p>One</p><div class="page-break"></div><p>Two</p>', settings, "2026-10-13");
    expect(html.match(/<section class="sheet">/g)).toHaveLength(2);
    expect(html).toContain("<span>1 / 2</span>");
    expect(html).toContain("<span>2 / 2</span>");
    expect(html).toContain("<span>Q4 review</span><span></span><span>2026-10-13</span>");
    expect(html).toContain("width: 210mm; min-height: 297mm;");
  });

  it("starts a sheet at each rule only with New page at each rule on", () => {
    const body = "<p>One</p><hr><p>Two</p>";
    expect(previewDocument("x", body, DEFAULT_PRINT_SETTINGS).match(/<section class="sheet">/g)).toHaveLength(1);
    expect(previewDocument("x", body, { ...DEFAULT_PRINT_SETTINGS, breakAtRules: true }).match(/<section class="sheet">/g)).toHaveLength(2);
  });

  it("uses the chosen margins", () => {
    expect(previewDocument("x", "<p>y</p>", { ...DEFAULT_PRINT_SETTINGS, margins: "wide" })).toContain("padding: 25mm 22mm;");
  });

  it("escapes header text", () => {
    const html = previewDocument("<b>x</b>", "<p>y</p>", { ...DEFAULT_PRINT_SETTINGS, header: "{title}" });
    expect(html).toContain("<span>&lt;b&gt;x&lt;/b&gt;</span>");
  });
});

describe("marginSides", () => {
  it("expands margin shorthand to top, right, bottom, left", () => {
    expect(marginSides("1in")).toEqual(["1in", "1in", "1in", "1in"]);
    expect(marginSides("18mm 16mm")).toEqual(["18mm", "16mm", "18mm", "16mm"]);
    expect(marginSides("1mm 2mm 3mm")).toEqual(["1mm", "2mm", "3mm", "2mm"]);
    expect(marginSides("1mm 2mm 3mm 4mm")).toEqual(["1mm", "2mm", "3mm", "4mm"]);
  });
});
