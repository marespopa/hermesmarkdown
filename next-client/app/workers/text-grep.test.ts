// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearGrepCache, grepFiles, type GrepProgress } from "./text-grep";
import type { GrepMode } from "./text-grep-protocol";

const run = async (files: Parameters<typeof grepFiles>[0], query: string, isCancelled = () => false, mode?: GrepMode) => {
  const reports: GrepProgress[] = [];
  await grepFiles(files, query, 50, (progress) => reports.push(progress), isCancelled, mode);
  return reports;
};

const handleFor = (file: { text: string; modified: number }) => {
  const read = vi.fn(async () => file.text);
  const handle = { getFile: async () => ({ size: file.text.length, lastModified: file.modified, text: read }) } as unknown as FileSystemFileHandle;
  return { handle, read };
};

describe("grepFiles", () => {
  beforeEach(() => {
    clearGrepCache();
    vi.useRealTimers();
  });

  it("ranks matching lines across text files and ends with a done report", async () => {
    const reports = await run([
      { path: "src/api.ts", name: "api.ts", content: "import x from 'y';\nexport function fetchOrders() {}\n" },
      { path: "config.yaml", name: "config.yaml", content: "orders:\n  limit: 5\n" },
      { path: "notes.txt", name: "notes.txt", content: "nothing here" },
    ], "orders");
    const last = reports[reports.length - 1];
    expect(last).toMatchObject({ done: true, scanned: 3, total: 3 });
    expect(last.hits.map((hit) => `${hit.path}:${hit.line}`).sort()).toEqual(["config.yaml:1", "src/api.ts:2"]);
  });

  it("reads files from their handles and skips binary ones", async () => {
    const handle = (text: string) => ({ getFile: async () => ({ size: text.length, text: async () => text }) }) as unknown as FileSystemFileHandle;
    const reports = await run([
      { path: "a.sh", name: "a.sh", handle: handle("echo deploy") },
      { path: "b.svg", name: "b.svg", handle: handle("deploy\u0000\u0001") },
    ], "deploy");
    expect(reports[reports.length - 1].hits.map((hit) => hit.path)).toEqual(["a.sh"]);
  });

  it("stops without a final report once cancelled, and answers short queries at once", async () => {
    expect(await run([{ path: "a.ts", name: "a.ts", content: "abc" }], "abc", () => true)).toEqual([]);
    expect(await run([{ path: "a.ts", name: "a.ts", content: "abc" }], "a")).toEqual([{ hits: [], scanned: 0, total: 1, done: true }]);
  });

  it("keeps read text between searches and reads again only once the file changed", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-24T10:00:00Z"));
    const file = { text: "alpha beta", modified: 1 };
    const { handle, read } = handleFor(file);
    const files = [{ path: "a.ts", name: "a.ts", handle }];

    await run(files, "alpha");
    await run(files, "beta");
    expect(read).toHaveBeenCalledTimes(1);

    // Past the recheck window, with a newer modified time: read again.
    file.text = "gamma";
    file.modified = 2;
    vi.setSystemTime(new Date("2026-10-24T10:00:05Z"));
    const reports = await run(files, "gamma");
    expect(read).toHaveBeenCalledTimes(2);
    expect(reports[reports.length - 1].hits.map((hit) => hit.path)).toEqual(["a.ts"]);
  });

  it("searches as a regex, skipping a note's frontmatter, and flags invalid patterns", async () => {
    const note = { path: "Plan.md", name: "Plan.md", isNote: true, content: "---\ntag: v12\n---\nShip v2 and v10\n" };
    const reports = await run([note], "v\\d+", () => false, "regex");
    const last = reports[reports.length - 1];
    expect(last.hits).toHaveLength(1);
    expect(last.hits[0]).toMatchObject({ line: 4, snippet: "Ship v2 and v10" });

    expect(await run([note], "(v", () => false, "regex")).toEqual([{ hits: [], scanned: 0, total: 1, done: true, invalid: true }]);
  });
});
