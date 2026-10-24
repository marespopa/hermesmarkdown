import { describe, expect, it } from "vitest";
import { isMarkdownPath, isPlainTextPath } from "./file-kinds";

describe("file kinds", () => {
  it("tells notes from other text files by extension", () => {
    expect(isMarkdownPath("notes/plan.md")).toBe(true);
    expect(isPlainTextPath("notes/plan.md")).toBe(false);
    for (const path of ["src/App.tsx", "data.json", "readme.txt", "scripts/run.sh"]) {
      expect(isPlainTextPath(path)).toBe(true);
    }
  });

  it("leaves out binaries, extensionless names and the vault's data folder", () => {
    for (const path of ["photo.png", "doc.pdf", "Makefile", ".hermesmarkdown/pins.yaml"]) {
      expect(isPlainTextPath(path)).toBe(false);
    }
  });
});
