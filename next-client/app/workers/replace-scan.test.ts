// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearReplaceCache, scanForReplace, type ReplaceProgress } from "./replace-scan";
import { MAX_PREVIEW_MATCHES, textFingerprint, type ReplaceQuery } from "./replace-search";
import type { GrepFile } from "./text-grep-protocol";

const query = (find: string, extra: Partial<ReplaceQuery> = {}): ReplaceQuery => ({ find, matchCase: false, wholeWord: false, regex: false, ...extra });

const run = async (files: GrepFile[], q: ReplaceQuery, isCancelled = () => false) => {
  const reports: ReplaceProgress[] = [];
  await scanForReplace(files, q, (progress) => reports.push(progress), isCancelled);
  return reports;
};

const FENCE = "```";
const board = `${FENCE}hermes-board\n{"title":"needle"}\n${FENCE}`;

describe("scanForReplace", () => {
  beforeEach(() => {
    clearReplaceCache();
    vi.useRealTimers();
  });

  it("reads given content and handles, with a fingerprint and the matches per file", async () => {
    const text = "needle here\nand a needle";
    const handle = { getFile: async () => ({ size: 3, lastModified: 1, text: async () => "no needle" }) } as unknown as FileSystemFileHandle;
    const reports = await run([
      { path: "a.md", name: "a.md", content: text },
      { path: "b.md", name: "b.md", handle },
      { path: "c.md", name: "c.md", content: "nothing" },
    ], query("needle"));
    const last = reports[reports.length - 1];
    expect(last).toMatchObject({ done: true, scanned: 3, total: 3, matchCount: 3 });
    const files = reports.flatMap((report) => report.files);
    expect(files.map((file) => file.path).sort()).toEqual(["a.md", "b.md"]);
    const a = files.find((file) => file.path === "a.md")!;
    expect(a.fingerprint).toBe(textFingerprint(text));
    expect(a.matches.map((m) => [m.line, m.column])).toEqual([[1, 0], [2, 6]]);
  });

  it("ends with exactly one done report, after any progress reports", async () => {
    const reports = await run([{ path: "a.md", name: "a.md", content: "needle" }], query("needle"));
    expect(reports.filter((report) => report.done)).toHaveLength(1);
    expect(reports[reports.length - 1].done).toBe(true);
  });

  it("stops at the cap and says capped", async () => {
    const content = "a ".repeat(MAX_PREVIEW_MATCHES - 10);
    const reports = await run([
      { path: "a.md", name: "a.md", content },
      { path: "b.md", name: "b.md", content },
    ], query("a", { matchCase: true }));
    const last = reports[reports.length - 1];
    expect(last).toMatchObject({ done: true, capped: true, matchCount: MAX_PREVIEW_MATCHES });
  });

  it("stops without a final report when cancelled", async () => {
    const reports = await run([{ path: "a.md", name: "a.md", content: "needle" }], query("needle"), () => true);
    expect(reports).toEqual([]);
  });

  it("reports an invalid regex once, done", async () => {
    const reports = await run([{ path: "a.md", name: "a.md", content: "x" }], query("(", { regex: true }));
    expect(reports).toEqual([{ files: [], scanned: 0, total: 1, matchCount: 0, done: true, invalid: true }]);
  });

  it("reports nothing invalid for empty Find", async () => {
    const reports = await run([{ path: "a.md", name: "a.md", content: "x" }], query(""));
    expect(reports).toEqual([{ files: [], scanned: 0, total: 1, matchCount: 0, done: true }]);
  });

  it("matches frontmatter", async () => {
    const reports = await run([{ path: "a.md", name: "a.md", content: "---\ntags: [needle]\n---\nbody" }], query("needle"));
    expect(reports[reports.length - 1].matchCount).toBe(1);
  });

  it("never matches board JSON in a note", async () => {
    const reports = await run([{ path: "a.md", name: "a.md", content: `needle\n${board}\nneedle` }], query("needle"));
    const [file] = reports.flatMap((report) => report.files);
    expect(file.matches.map((m) => m.line)).toEqual([1, 5]);
  });

  it("doesn't treat a board fence in a code file as one", async () => {
    const reports = await run([{ path: "a.ts", name: "a.ts", content: `const s = \`\n${board}\n\`;` }], query("needle"));
    expect(reports[reports.length - 1].matchCount).toBe(1);
  });
});
