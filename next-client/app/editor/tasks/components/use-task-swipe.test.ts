// @vitest-environment node
import { describe, expect, it } from "vitest";
import { SWIPE_THRESHOLD, swipeOffset, taskSwipeActions } from "./use-task-swipe";

describe("taskSwipeActions", () => {
  it("swipes right to move forward and left to set aside", () => {
    expect(taskSwipeActions("todo")).toEqual({ right: { status: "prog", label: "Start" }, left: { status: "hold", label: "Hold" } });
    expect(taskSwipeActions("prog")).toEqual({ right: { status: "done", label: "Complete" }, left: { status: "hold", label: "Hold" } });
    expect(taskSwipeActions("hold")).toEqual({ right: { status: "prog", label: "Resume" }, left: { status: "cancelled", label: "Cancel" } });
  });

  it("only reopens a closed task, with nothing to the left", () => {
    for (const status of ["done", "cancelled"] as const) {
      expect(taskSwipeActions(status)).toEqual({ right: { status: "todo", label: "Reopen" } });
    }
  });
});

describe("swipeOffset", () => {
  it("follows the finger up to the threshold, then rubber-bands", () => {
    expect(swipeOffset(40, true)).toBe(40);
    expect(swipeOffset(-SWIPE_THRESHOLD, true)).toBe(-SWIPE_THRESHOLD);
    expect(swipeOffset(SWIPE_THRESHOLD + 30, true)).toBe(SWIPE_THRESHOLD + 10);
    expect(swipeOffset(-(SWIPE_THRESHOLD + 30), true)).toBe(-(SWIPE_THRESHOLD + 10));
  });

  it("barely moves toward a side without an action", () => {
    expect(swipeOffset(-100, false)).toBe(-25);
  });
});
