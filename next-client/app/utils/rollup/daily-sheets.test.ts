// @vitest-environment node
import { describe, expect, it } from "vitest";
import { pickDailySheets } from "./daily-sheets";
import { parseRollupName } from "./period";

const week = parseRollupName("2026-W41.md")!;
const folderFor = (date: Date) => `journal/${date.getFullYear()}`;

describe("pickDailySheets", () => {
  it("finds the period's daily sheets anywhere by file name, oldest first", () => {
    const paths = ["journal/2026/2026-10-07.md", "old/2026-10-05.md", "2026-10-12.md", "journal/2026/2026-10-04.md", "notes/2026-10-06-standup.md", "2026-W41.md"];
    expect(pickDailySheets(paths, week, folderFor)).toEqual([
      { date: "2026-10-05", path: "old/2026-10-05.md" },
      { date: "2026-10-07", path: "journal/2026/2026-10-07.md" },
    ]);
  });

  it("uses one file per date: the Daily Sheets folder first, else the shallowest", () => {
    const paths = ["a/b/2026-10-06.md", "x/2026-10-06.md", "journal/2026/2026-10-08.md", "2026-10-08.md"];
    expect(pickDailySheets(paths, week, folderFor)).toEqual([
      { date: "2026-10-06", path: "x/2026-10-06.md" },
      { date: "2026-10-08", path: "journal/2026/2026-10-08.md" },
    ]);
  });

  it("leaves out skipped paths", () => {
    const skip = (path: string) => path.startsWith(".hermes/");
    expect(pickDailySheets([".hermes/2026-10-06.md"], week, folderFor, skip)).toEqual([]);
  });
});
