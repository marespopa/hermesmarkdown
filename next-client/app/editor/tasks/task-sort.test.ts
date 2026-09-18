import { describe, expect, it } from "vitest";
import { sortTasks } from "./task-sort";
import type { TaskItem } from "@/app/utils/taskExtractor";

const task = (id: string, overrides: Partial<TaskItem> = {}): TaskItem => ({
  id,
  path: "note.md",
  line: 0,
  checked: false,
  inProgress: false,
  onHold: false,
  dueDate: null,
  priority: null,
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

  it("supports a descending text sort", () => {
    const tasks = [task("a", { text: "Alpha" }), task("z", { text: "Zulu" })];
    expect(sortTasks(tasks, "text", "desc", (path) => path).map(({ id }) => id)).toEqual(["z", "a"]);
  });
});
