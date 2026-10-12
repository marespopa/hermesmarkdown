// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TaskItem } from "@/app/utils/taskExtractor";
import type { TaskStatus } from "@/app/utils/task-status";
import { buildViewSections, localISODate, UP_NEXT_LIMIT, upcomingLabel, viewCounts } from "./task-views";

const TODAY = "2026-10-12"; // a Monday

const task = (id: string, status: TaskStatus = "todo", dueDate: string | null = null): TaskItem => ({
  id,
  path: "note.md",
  line: 0,
  status,
  checked: status === "done",
  dueDate,
  priority: null,
  tags: [],
  text: id,
  raw: "",
  lineHash: "",
});

const sections = (view: "now" | "today" | "upcoming", tasks: TaskItem[]) =>
  buildViewSections(view, tasks, TODAY, (path) => path).map((s) => [s.title, s.tasks.map((t) => t.id)]);

describe("buildViewSections", () => {
  it("Now: in progress first, then the next to-dos by due date", () => {
    const tasks = [
      task("later", "todo", "2026-10-20"),
      task("undated"),
      task("building", "prog"),
      task("soon", "todo", "2026-10-13"),
      task("waiting", "hold"),
      task("shipped", "done"),
    ];
    expect(sections("now", tasks)).toEqual([
      ["In Progress", ["building"]],
      ["Up Next", ["soon", "later", "undated"]],
    ]);
  });

  it(`Now: caps Up Next at ${UP_NEXT_LIMIT} and leaves out empty sections`, () => {
    const tasks = Array.from({ length: 8 }, (_, i) => task(`t${i}`, "todo", `2026-10-1${i}`));
    const result = buildViewSections("now", tasks, TODAY, (p) => p);
    expect(result.map((s) => s.id)).toEqual(["next"]);
    expect(result[0].tasks).toHaveLength(UP_NEXT_LIMIT);
  });

  it("Today: overdue open tasks, then today's; never closed ones", () => {
    const tasks = [
      task("due today", "prog", TODAY),
      task("late", "hold", "2026-10-09"),
      task("late but done", "done", "2026-10-09"),
      task("late but cancelled", "cancelled", "2026-10-09"),
      task("tomorrow", "todo", "2026-10-13"),
    ];
    const result = buildViewSections("today", tasks, TODAY, (p) => p);
    expect(result.map((s) => [s.title, s.overdue ?? false, s.tasks.map((t) => t.id)])).toEqual([
      ["Overdue", true, ["late"]],
      ["Today", false, ["due today"]],
    ]);
  });

  it("Upcoming: one section per later day, in date order", () => {
    const tasks = [
      task("review", "todo", "2026-10-30"),
      task("deploy", "todo", "2026-10-13"),
      task("demo", "prog", "2026-10-16"),
      task("retro", "todo", "2026-10-13"),
      task("today", "todo", TODAY),
      task("loose date", "todo", "next week"),
    ];
    expect(sections("upcoming", tasks)).toEqual([
      ["Tomorrow", ["deploy", "retro"]],
      ["Friday", ["demo"]],
      ["Fri 30 Oct", ["review"]],
    ]);
  });
});

describe("upcomingLabel", () => {
  it("names tomorrow, weekdays within the week, then the date", () => {
    expect(upcomingLabel("2026-10-13", TODAY)).toBe("Tomorrow");
    expect(upcomingLabel("2026-10-18", TODAY)).toBe("Sunday");
    expect(upcomingLabel("2026-10-19", TODAY)).toBe("Mon 19 Oct");
    expect(upcomingLabel("2027-01-04", TODAY)).toBe("Mon 4 Jan 2027");
  });
});

describe("viewCounts", () => {
  it("counts what each list shows", () => {
    const tasks = [task("a", "prog", TODAY), task("b", "todo", "2026-10-14"), task("c", "done")];
    expect(viewCounts(tasks, TODAY, (p) => p)).toEqual({ now: 2, today: 1, upcoming: 1, all: 3 });
  });
});

describe("localISODate", () => {
  afterEach(() => vi.useRealTimers());

  it("uses the local calendar day", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12, 23, 30));
    expect(localISODate()).toBe("2026-10-12");
  });
});
