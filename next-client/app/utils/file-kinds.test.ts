import { describe, expect, it } from "vitest";
import { isImagePath, isMarkdownPath, isPlainTextPath } from "./file-kinds";

describe("file kinds", () => {
  it("tells notes from other text files by extension", () => {
    expect(isMarkdownPath("notes/plan.md")).toBe(true);
    expect(isPlainTextPath("notes/plan.md")).toBe(false);
    for (const path of ["src/App.tsx", "data.json", "readme.txt", "scripts/run.sh"]) {
      expect(isPlainTextPath(path)).toBe(true);
    }
  });

  it("knows text files by name: build files, licences and tool dotfiles", () => {
    for (const path of ["Dockerfile", "app/Makefile", "LICENSE", ".gitignore", "web/.editorconfig", ".nvmrc"]) {
      expect(isPlainTextPath(path)).toBe(true);
    }
  });

  it("leaves out binaries, other extensionless names and the vault's data folder", () => {
    for (const path of ["photo.png", "doc.pdf", "bin/server", ".DS_Store", ".hermesmarkdown/trash/old.yaml"]) {
      expect(isPlainTextPath(path)).toBe(false);
    }
  });

  it("treats images, SVG included, as pictures rather than text", () => {
    for (const path of ["photo.png", "a/b/diagram.SVG", "pic.jpeg", "x.webp"]) {
      expect(isImagePath(path)).toBe(true);
      expect(isPlainTextPath(path)).toBe(false);
    }
    expect(isImagePath("notes/plan.md")).toBe(false);
    expect(isImagePath("doc.pdf")).toBe(false);
  });
});
