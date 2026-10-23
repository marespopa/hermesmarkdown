// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { FileMetadata } from "@/app/atoms/metadata";
import { fileLinkPath, resolveFileLink } from "./file-link";

const meta = (path: string) => ({ path, name: path.split("/").pop() }) as unknown as FileMetadata;

describe("fileLinkPath", () => {
  it("reads a relative path from the linking note's folder", () => {
    expect(fileLinkPath("./app/editor/README.md", "README.md")).toBe("app/editor/README.md");
    expect(fileLinkPath("app/editor/README.md", "docs/index.md")).toBe("docs/app/editor/README.md");
    expect(fileLinkPath("../plans/roadmap.md", "docs/guide/start.md")).toBe("docs/plans/roadmap.md");
  });

  it("starts a leading slash at the vault root", () => {
    expect(fileLinkPath("/plans/roadmap.md", "docs/guide/start.md")).toBe("plans/roadmap.md");
  });

  it("drops headings and queries and decodes escapes", () => {
    expect(fileLinkPath("./Release%20notes.md#Goals", "index.md")).toBe("Release notes.md");
    expect(fileLinkPath("./plan.md?raw", "index.md")).toBe("plan.md");
  });

  it("returns null for a link out of the vault or to no file", () => {
    expect(fileLinkPath("../outside.md", "index.md")).toBeNull();
    expect(fileLinkPath("#Goals", "index.md")).toBeNull();
    expect(fileLinkPath("./", "index.md")).toBeNull();
  });
});

describe("resolveFileLink", () => {
  const files = {
    "app/editor/README.md": meta("app/editor/README.md"),
    "plans/Roadmap.md": meta("plans/Roadmap.md"),
  };

  it("finds the file at the path, in any case, or with .md added", () => {
    expect(resolveFileLink("./app/editor/README.md", files, "README.md")?.path).toBe("app/editor/README.md");
    expect(resolveFileLink("/plans/roadmap.md", files, "README.md")?.path).toBe("plans/Roadmap.md");
    expect(resolveFileLink("plans/Roadmap", files, "README.md")?.path).toBe("plans/Roadmap.md");
  });

  it("returns null when the file isn't in the vault", () => {
    expect(resolveFileLink("./app/missing.md", files, "README.md")).toBeNull();
  });
});
