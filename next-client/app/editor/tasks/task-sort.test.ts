// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sortTasks } from "./task-sort";
import type { TaskItem } from "@/app/utils/taskExtractor";

const task = (id: string, overrides: Partial<TaskItem> = {}): TaskItem => ({
  id,
  path: "note.md",
  line: 0,
  status: "todo",
  checked: false,
  dueDate: null,
  priority: null,
  startedDate: null,
  doneDate: null,
  tags: [],
  text: id,
  raw: "",
  lineHash: "",
  ...overrides,
});

describe("sortTasks", () => {
  it("defaults due-date ordering to ascending with priority descending ties", () => {
    const tasks = [
      task("low-priority", { dueDate: "2026-09-20", priority: "low" }),
      task("high-priority", { dueDate: "2026-09-20", priority: "high" }),
      task("earlier", { dueDate: "2026-09-19" }),
      task("no-date"),
    ];

    expect(sortTasks(tasks, "dueDate", "asc", (path) => path).map(({ id }) => id)).toEqual([
      "earlier",
      "high-priority",
      "low-priority",
      "no-date",
    ]);
  });

  it("orders by status: to do, in progress, on hold, done, cancelled", () => {
    const tasks = [
      task("cancelled", { status: "cancelled" }),
      task("done", { status: "done", checked: true }),
      task("hold", { status: "hold" }),
      task("prog", { status: "prog" }),
      task("todo"),
    ];
    expect(sortTasks(tasks, "status", "asc", (path) => path).map(({ id }) => id)).toEqual([
      "todo",
      "prog",
      "hold",
      "done",
      "cancelled",
    ]);
  });

  it("supports a descending text sort", () => {
    const tasks = [task("a", { text: "Alpha" }), task("z", { text: "Zulu" })];
    expect(sortTasks(tasks, "text", "desc", (path) => path).map(({ id }) => id)).toEqual(["z", "a"]);
  });
});
