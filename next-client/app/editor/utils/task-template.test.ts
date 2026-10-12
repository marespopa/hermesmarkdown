// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildTaskText } from "./task-template";

describe("buildTaskText", () => {
  it("builds a todo task with optional due date and tags", () => {
    expect(buildTaskText({
      title: "Ship report",
      status: "todo",
      dueDate: "2026-08-27",
      tags: ["work", "urgent"],
    })).toBe("- [ ] Ship report @due(2026-08-27) #work #urgent");
  });

  it("includes priority metadata when provided", () => {
    expect(buildTaskText({
      title: "Review PR",
      status: "prog",
      dueDate: "2026-08-29",
      priority: "high",
      tags: ["code"],
    })).toBe("- [/] Review PR @due(2026-08-29) @priority(high) #code");
  });

  it("writes the status as the box character, never as a tag", () => {
    const build = (status: "todo" | "prog" | "hold" | "done") =>
      buildTaskText({ title: "Draft outline", status, dueDate: "", tags: ["writing"] });
    expect(build("prog")).toBe("- [/] Draft outline #writing");
    expect(build("hold")).toBe("- [!] Draft outline #writing");
    expect(build("done")).toBe("- [x] Draft outline #writing");
  });
});
