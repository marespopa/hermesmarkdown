import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cycleTaskBox } from "./live-markers-widgets";

const view = (doc = "- [ ] task") => new EditorView({ state: EditorState.create({ doc }) });

describe("cycleTaskBox", () => {
  afterEach(() => vi.useRealTimers());

  it("moves a task on a status, to do → in progress → done → to do, with its stamps", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12, 9, 0));
    for (const [before, after] of [
      [" ] task", "/] task @started(2026-10-12)"],
      ["/] task @started(2026-10-09)", "x] task @started(2026-10-09) @done(2026-10-12)"],
      ["!] task @started(2026-10-09)", "/] task @started(2026-10-09)"],
      ["x] task @started(2026-10-09) @done(2026-10-11)", " ] task"],
      ["-] task", " ] task"],
    ]) {
      const v = view(`- [${before}`);
      cycleTaskBox(v, 0);
      expect(v.state.doc.toString()).toBe(`- [${after}`);
    }
  });

  it("cycles a numbered task", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12, 9, 0));
    const v = view("1. [ ] task");
    cycleTaskBox(v, 0);
    expect(v.state.doc.toString()).toBe("1. [/] task @started(2026-10-12)");
  });
});
