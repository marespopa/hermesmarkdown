// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyLineEdits, localISODate, statusLineEdits, withTaskStatus } from "./task-line";

const TODAY = "2026-10-12";

describe("withTaskStatus", () => {
  it("stamps the start once, and keeps it through a restart", () => {
    const started = withTaskStatus("- [ ] Deploy billing #infra", "prog", TODAY);
    expect(started).toBe("- [/] Deploy billing #infra @started(2026-10-12)");
    const paused = withTaskStatus(started, "hold", "2026-10-13");
    expect(paused).toBe("- [!] Deploy billing #infra @started(2026-10-12)");
    expect(withTaskStatus(paused, "prog", "2026-10-14")).toBe(started);
  });

  it("stamps the day it was done, and drops it when reopened", () => {
    const done = withTaskStatus("- [/] Ship report @started(2026-10-08)", "done", TODAY);
    expect(done).toBe("- [x] Ship report @started(2026-10-08) @done(2026-10-12)");
    expect(withTaskStatus(done, "prog", TODAY)).toBe("- [/] Ship report @started(2026-10-08)");
    expect(withTaskStatus(done, "cancelled", TODAY)).toBe("- [-] Ship report @started(2026-10-08)");
  });

  it("drops both stamps on a reset to to do", () => {
    expect(withTaskStatus("- [x] Ship @started(2026-10-08) @done(2026-10-12)", "todo", TODAY)).toBe("- [ ] Ship");
  });

  it("removes a stamp from the middle of a line without leaving double spaces", () => {
    expect(withTaskStatus("- [x] Ship @done(2026-10-12) #infra", "todo", TODAY)).toBe("- [ ] Ship #infra");
  });

  it("works on ordered and indented task lines, and stamps before trailing spaces", () => {
    expect(withTaskStatus("  1. [ ] Nested step  ", "done", TODAY)).toBe("  1. [x] Nested step @done(2026-10-12)  ");
  });

  it("leaves a line that isn't a task alone", () => {
    expect(withTaskStatus("Plain text @done(2026-10-12)", "todo", TODAY)).toBe("Plain text @done(2026-10-12)");
    expect(statusLineEdits("- plain bullet", "done", TODAY)).toBeNull();
  });

  it("returns sorted, non-overlapping edits that applyLineEdits replays", () => {
    const line = "- [x] Ship @done(2026-10-12)";
    const edits = statusLineEdits(line, "prog", TODAY)!;
    for (let i = 1; i < edits.length; i++) expect(edits[i].from).toBeGreaterThanOrEqual(edits[i - 1].to);
    expect(applyLineEdits(line, edits)).toBe("- [/] Ship @started(2026-10-12)");
  });
});

describe("localISODate", () => {
  afterEach(() => vi.useRealTimers());

  it("uses the local calendar day, and is the stamps' default", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12, 23, 30));
    expect(localISODate()).toBe("2026-10-12");
    expect(withTaskStatus("- [ ] Ship", "done")).toBe("- [x] Ship @done(2026-10-12)");
  });
});
