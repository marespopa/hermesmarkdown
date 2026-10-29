import { describe, expect, it } from "vitest";
import { CLEANER_EXAMPLES } from "./cleaner-examples";
import { convertInput, detectFormat } from "./convert-input";

const example = (id: string) => CLEANER_EXAMPLES.find((entry) => entry.id === id)!.text;

describe("detectFormat", () => {
  it("recognizes HTML", () => {
    expect(detectFormat("<p>Hi <b>there</b></p>")).toBe("html");
    expect(detectFormat(example("html"))).toBe("html");
    expect(detectFormat(example("docs"))).toBe("html");
  });

  it("keeps Markdown with some HTML as Markdown", () => {
    expect(detectFormat('<div align="center">x</div>\n\n# Title')).toBe("markdown");
    expect(detectFormat(example("markdown"))).toBe("markdown");
  });

  it("recognizes CSV and TSV, but not prose with commas", () => {
    expect(detectFormat("a\tb\n1\t2")).toBe("csv");
    expect(detectFormat(example("csv"))).toBe("csv");
    expect(
      detectFormat(
        "I went to the shop and bought a lot of different things for our dinner, then\nwe ate it all together at the big table with the rest of the family, ok",
      ),
    ).toBe("markdown");
  });
});

describe("convertInput", () => {
  it("returns nothing for blank input", () => {
    expect(convertInput("  ", "auto")).toEqual({ markdown: "", fixes: [], format: "markdown" });
  });

  it("turns CSV into an aligned table", () => {
    const { markdown, format } = convertInput("Item,Size\nBox,Big", "auto");
    expect(format).toBe("csv");
    expect(markdown).toBe("| Item | Size |\n| :--- | :--- |\n| Box  | Big  |\n");
  });

  it("follows the chosen format over detection", () => {
    expect(convertInput("<b>x</b> y", "markdown").markdown).toBe("**x** y\n");
    expect(convertInput("<b>x</b> y", "html").markdown).toBe("**x** y\n");
  });
});
