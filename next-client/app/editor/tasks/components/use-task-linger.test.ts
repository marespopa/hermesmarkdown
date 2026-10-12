import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskItem } from "@/app/utils/taskExtractor";
import type { TaskStatus } from "@/app/utils/task-status";
import { LINGER_MS, useTaskLinger } from "./use-task-linger";

const task = (id: string, status: TaskStatus = "todo"): TaskItem => ({
  id,
  path: "note.md",
  line: 0,
  status,
  checked: status === "done",
  dueDate: null,
  priority: null,
  startedDate: null,
  doneDate: null,
  tags: [],
  text: id,
  raw: "",
  lineHash: "",
});

type Group = { id: string; tasks: TaskItem[] };
const ids = (groups: Group[]) => groups.map((g) => [g.id, g.tasks.map((t) => `${t.id}:${t.status}`)]);

function setup(initial: { groups: Group[]; tasks: TaskItem[]; key: string }) {
  return renderHook(({ groups, tasks, key }) => useTaskLinger(groups, tasks, key), { initialProps: initial });
}

describe("useTaskLinger", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const before = [task("ship"), task("draft")];
  const groupsBefore: Group[] = [{ id: "todo", tasks: before }];

  it("keeps a completed task in place, showing its new status, then lets the list settle", () => {
    const hook = setup({ groups: groupsBefore, tasks: before, key: "all" });
    act(() => hook.result.current.hold(before[0], "done"));
    expect(ids(hook.result.current.groups)).toEqual([["todo", ["ship:done", "draft:todo"]]]);

    // The rescan moves it to Done; the list still holds still.
    const after = [task("ship", "done"), task("draft")];
    const groupsAfter: Group[] = [{ id: "todo", tasks: [after[1]] }, { id: "done", tasks: [after[0]] }];
    hook.rerender({ groups: groupsAfter, tasks: after, key: "all" });
    expect(ids(hook.result.current.groups)).toEqual([["todo", ["ship:done", "draft:todo"]]]);
    expect(hook.result.current.lingering).toBe(true);

    act(() => vi.advanceTimersByTime(LINGER_MS));
    expect(ids(hook.result.current.groups)).toEqual([["todo", ["draft:todo"]], ["done", ["ship:done"]]]);
    expect(hook.result.current.lingering).toBe(false);
  });

  it("restarts the beat on each further change", () => {
    const hook = setup({ groups: groupsBefore, tasks: before, key: "all" });
    act(() => hook.result.current.hold(before[0], "done"));
    act(() => vi.advanceTimersByTime(LINGER_MS - 200));
    act(() => hook.result.current.hold(before[1], "done"));
    act(() => vi.advanceTimersByTime(LINGER_MS - 200));
    expect(hook.result.current.lingering).toBe(true);
    expect(ids(hook.result.current.groups)).toEqual([["todo", ["ship:done", "draft:done"]]]);
    act(() => vi.advanceTimersByTime(200));
    expect(hook.result.current.lingering).toBe(false);
  });

  it("lets go at once when the list on screen changes", () => {
    const hook = setup({ groups: groupsBefore, tasks: before, key: "all" });
    act(() => hook.result.current.hold(before[0], "done"));
    const today: Group[] = [{ id: "today", tasks: [before[1]] }];
    hook.rerender({ groups: today, tasks: before, key: "today" });
    expect(ids(hook.result.current.groups)).toEqual([["today", ["draft:todo"]]]);
  });
});
