import { describe, expect, it } from "vitest";
import { buildTaskText } from "./task-template";

describe("buildTaskText", () => {
  it("builds a todo task with optional due date and tags", () => {
    expect(buildTaskText({
      title: "Ship report",
      status: "todo",
      dueDate: "2026-08-27",
      tags: ["work", "urgent"],
    })).toBe("- [ ] Ship report @due(2026-08-27) #todo #work #urgent");
  });

  it("includes priority metadata when provided", () => {
    expect(buildTaskText({
      title: "Review PR",
      status: "prog",
      dueDate: "2026-08-29",
      priority: "high",
      tags: ["code"],
    })).toBe("- [ ] Review PR @due(2026-08-29) @priority(high) #prog #code");
  });

  it("builds an in-progress task without due date and without a duplicate status tag", () => {
    expect(buildTaskText({
      title: "Draft outline",
      status: "prog",
      dueDate: "",
      tags: ["writing"],
    })).toBe("- [ ] Draft outline #prog #writing");
  });
});
