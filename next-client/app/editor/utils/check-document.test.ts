import { describe, expect, it, vi } from "vitest";
import type { FileMetadata } from "@/app/atoms/metadata";
import { checkDocument, createVaultFileExists, fixesAsChanges, type CheckContext } from "./check-document";

function meta(path: string): FileMetadata {
  return {
    path, name: path.split("/").pop()!, tags: [], links: [], frontmatter: {}, modifiedAt: 0,
    wordCount: 0, tasks: [], handle: null,
  };
}

function context(paths: string[], files: string[] = [], notePath: string | null = "notes/today.md"): CheckContext {
  return {
    notePath,
    fileMetadata: Object.fromEntries(paths.map((path) => [path, meta(path)])),
    fileExists: vi.fn(async (path: string) => files.includes(path)),
  };
}

const apply = (text: string, issues: Awaited<ReturnType<typeof checkDocument>>) =>
  fixesAsChanges(issues).reduceRight((out, fix) => out.slice(0, fix.from) + fix.insert + out.slice(fix.to), text);

describe("checkDocument links", () => {
  it("accepts links that resolve", async () => {
    const issues = await checkDocument("See [[Plan]] and [Plan](../Plan.md).", context(["Plan.md"]));
    expect(issues).toEqual([]);
  });

  it("suggests the note a wikilink most likely meant", async () => {
    const text = "Read [[planning]] today.";
    const issues = await checkDocument(text, context(["Planing.md", "Budget.md"]));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ kind: "broken-link", line: 1, fix: { label: "Link to Planing" } });
    expect(apply(text, issues)).toBe("Read [[Planing]] today.");
  });

  it("offers to unlink when nothing is close, keeping the alias", async () => {
    const text = "Ask [[Zebra crossing|the crossing]].";
    const issues = await checkDocument(text, context(["Budget.md"]));
    expect(issues[0].fix.label).toBe("Unlink");
    expect(apply(text, issues)).toBe("Ask the crossing.");
  });

  it("does not guess between equally close notes", async () => {
    const issues = await checkDocument("[[Plan A]]", context(["Plan B.md", "Plan C.md"]));
    expect(issues[0].fix.label).toBe("Unlink");
  });

  it("flags a Markdown link to a missing file, but not to the web or an anchor", async () => {
    const text = "[a](./gone.md) [b](https://example.com) [c](#top) [d](mailto:me@example.com)";
    const issues = await checkDocument(text, context([]));
    expect(issues.map((issue) => issue.kind)).toEqual(["broken-link"]);
    expect(apply(text, issues)).toBe("a [b](https://example.com) [c](#top) [d](mailto:me@example.com)");
  });

  it("accepts a link to a non-note file that exists", async () => {
    const ctx = context([], ["notes/report.pdf"]);
    expect(await checkDocument("[Report](report.pdf)", ctx)).toEqual([]);
    expect(ctx.fileExists).toHaveBeenCalledWith("notes/report.pdf");
  });

  it("skips links in code and embeds of media", async () => {
    const text = "`[[Nope]]`\n\n```\n[[Nope]] [x](gone.md)\n```\n\n![[photo.png]]";
    expect(await checkDocument(text, context([]))).toEqual([]);
  });
});

describe("checkDocument images", () => {
  it("flags an image that isn't in the vault and offers to remove it", async () => {
    const text = "Before ![chart](assets/chart.png) after";
    const issues = await checkDocument(text, context([], ["notes/assets/other.png"]));
    expect(issues[0]).toMatchObject({ kind: "missing-image", line: 1, fix: { label: "Remove image" } });
    expect(apply(text, issues)).toBe("Before  after");
  });

  it("accepts an image that exists, and web images", async () => {
    const ctx = context([], ["notes/assets/chart.png"]);
    expect(await checkDocument("![a](assets/chart.png) ![b](https://example.com/x.png)", ctx)).toEqual([]);
  });

  it("checks each path once and reads a failed lookup as present", async () => {
    const ctx = context([]);
    ctx.fileExists = vi.fn(async () => { throw new Error("denied"); });
    expect(await checkDocument("![a](x.png) ![b](x.png)", ctx)).toEqual([]);
    expect(ctx.fileExists).toHaveBeenCalledTimes(1);
  });
});

describe("checkDocument headings", () => {
  it("flags a heading that skips a level and offers the right one", async () => {
    const text = "# Title\n\n### Deep\n";
    const issues = await checkDocument(text, context([]));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ kind: "skipped-heading", line: 3, fix: { label: "Make it H2" } });
    expect(apply(text, issues)).toBe("# Title\n\n## Deep\n");
  });

  it("measures later headings from the corrected one", async () => {
    const text = "# A\n### B\n#### C\n";
    const issues = await checkDocument(text, context([]));
    expect(issues.map((issue) => issue.line)).toEqual([2, 3]);
    expect(apply(text, issues)).toBe("# A\n## B\n### C\n");
  });

  it("does not mind going back up, a first heading, or # inside code and frontmatter", async () => {
    const text = "---\n# yaml\n---\n### Start\n## Up\n```\n##### x\n```\n# Top";
    expect(await checkDocument(text, context([]))).toEqual([]);
  });
});

describe("createVaultFileExists", () => {
  function folder(tree: Record<string, unknown>): FileSystemDirectoryHandle {
    return {
      getDirectoryHandle: async (name: string) => {
        const child = tree[name];
        if (!child || typeof child === "string") throw new Error("NotFoundError");
        return folder(child as Record<string, unknown>);
      },
      getFileHandle: async (name: string) => {
        if (tree[name] !== "file") throw new Error("NotFoundError");
        return {} as FileSystemFileHandle;
      },
    } as unknown as FileSystemDirectoryHandle;
  }

  it("finds files at any depth and reports missing ones", async () => {
    const exists = createVaultFileExists(folder({ "a.png": "file", assets: { "b.png": "file", deep: { "c.png": "file" } } }));
    expect(await exists("a.png")).toBe(true);
    expect(await exists("assets/b.png")).toBe(true);
    expect(await exists("assets/deep/c.png")).toBe(true);
    expect(await exists("assets/missing.png")).toBe(false);
    expect(await exists("nowhere/b.png")).toBe(false);
  });
});
