import { describe, expect, it } from "vitest";
import { guardFilePath, guardFolderPath, guardItemPath, guardNewName, normalizeVaultPath } from "./path-guard";

describe("normalizeVaultPath", () => {
  it("makes a path vault-relative", () => {
    expect(normalizeVaultPath("./Projects//Roadmap.md")).toBe("Projects/Roadmap.md");
    expect(normalizeVaultPath("/Projects/")).toBe("Projects");
    expect(normalizeVaultPath("Projects\\scripts\\build.py")).toBe("Projects/scripts/build.py");
    expect(normalizeVaultPath("/")).toBe("");
  });

  it("refuses a path that climbs out of the vault", () => {
    expect(normalizeVaultPath("Projects/../../secrets.md")).toBeNull();
  });
});

describe("guardFolderPath", () => {
  it("allows the top level and ordinary folders", () => {
    expect(guardFolderPath("")).toEqual({ ok: true, path: "" });
    expect(guardFolderPath("Projects/")).toEqual({ ok: true, path: "Projects" });
  });

  it("refuses the app's data folder, Trash included", () => {
    expect(guardFolderPath(".hermesmarkdown").ok).toBe(false);
    expect(guardFolderPath(".hermesmarkdown/trash").ok).toBe(false);
  });
});

describe("guardFilePath", () => {
  it("allows notes and known code files", () => {
    expect(guardFilePath("Projects/Roadmap.md")).toEqual({ ok: true, path: "Projects/Roadmap.md" });
    expect(guardFilePath("scripts/build.py")).toEqual({ ok: true, path: "scripts/build.py" });
  });

  it("refuses binaries, folders, the data folder and escapes", () => {
    expect(guardFilePath("assets/logo.png").ok).toBe(false);
    expect(guardFilePath("").ok).toBe(false);
    expect(guardFilePath(".hermesmarkdown/trash/Old.md").ok).toBe(false);
    expect(guardFilePath("../Outside.md").ok).toBe(false);
  });
});

describe("guardItemPath", () => {
  it("allows any file or folder, never the top level or the data folder", () => {
    expect(guardItemPath("./Assets/photo.png")).toEqual({ ok: true, path: "Assets/photo.png" });
    expect(guardItemPath("Projects")).toEqual({ ok: true, path: "Projects" });
    expect(guardItemPath("/").ok).toBe(false);
    expect(guardItemPath(".hermesmarkdown/trash").ok).toBe(false);
    expect(guardItemPath("../outside.md").ok).toBe(false);
  });
});

describe("guardNewName", () => {
  it("keeps a file's extension unless the name gives a known one", () => {
    expect(guardNewName("Launch plan", "Roadmap.md", true)).toEqual({ ok: true, path: "Launch plan.md" });
    expect(guardNewName("Plan v1.2", "Roadmap.md", true)).toEqual({ ok: true, path: "Plan v1.2.md" });
    expect(guardNewName("notes.txt", "Roadmap.md", true)).toEqual({ ok: true, path: "notes.txt" });
    expect(guardNewName("Archive 2026", "Archive", false)).toEqual({ ok: true, path: "Archive 2026" });
  });

  it("refuses folders and empty names", () => {
    expect(guardNewName("Projects/Plan", "Roadmap.md", true).ok).toBe(false);
    expect(guardNewName("  ", "Roadmap.md", true).ok).toBe(false);
  });
});
