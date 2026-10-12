import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Provider } from "jotai";
import type { DisplayTask } from "@/app/atoms/task-atoms";
import { MASKED_TEXT, maskTask } from "@/app/utils/note-display";
import TaskRow from "./TaskRow";

const SECRET = "Wire the secret payment";

const task: DisplayTask = {
  id: "Payroll.md#2", path: "Payroll.md", line: 2, status: "todo", checked: false,
  dueDate: "2026-10-10", priority: null, startedDate: null, doneDate: null, tags: ["money"], text: SECRET, raw: `- [ ] ${SECRET} #money`, lineHash: "h",
  isMasked: false,
};

function renderRow(row: DisplayTask) {
  const handlers = { onToggle: vi.fn(), onSetStatus: vi.fn(), onNavigate: vi.fn() };
  render(
    <Provider>
      <TaskRow task={row} subtitle="Payroll" {...handlers} />
    </Provider>,
  );
  return handlers;
}

describe("TaskRow", () => {
  // A fixed "now" before the fixture's due date, so it always reads as a
  // future date ("Due: 2026-10-10"), never "Today" or "Overdue".
  beforeEach(() => {
    cleanup();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 1, 12, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("shows a regular task's text and tags", () => {
    renderRow(task);
    expect(screen.getByText(SECRET)).toBeInTheDocument();
    expect(screen.getByText("#money")).toBeInTheDocument();
    expect(screen.queryByLabelText("Sensitive note")).toBeNull();
  });

  it("masks a sensitive task's text and tags but still toggles and navigates", () => {
    const { onToggle, onNavigate } = renderRow({ ...maskTask(task), isMasked: true });

    expect(document.body.textContent).not.toContain(SECRET);
    expect(screen.queryByText("#money")).toBeNull();
    expect(screen.getByText(MASKED_TEXT)).toBeInTheDocument();
    expect(screen.getByText("Sensitive task")).toBeInTheDocument();
    expect(screen.getByLabelText("Sensitive note")).toBeInTheDocument();
    expect(screen.getByText("Payroll")).toBeInTheDocument();
    expect(screen.getByText(/2026-10-10/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText("Payroll"));
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("sets any status from the row's menu, with the current one checked", () => {
    const { onSetStatus, onToggle } = renderRow({ ...task, status: "prog" });

    fireEvent.click(screen.getByRole("button", { name: "Change status" }));
    expect(screen.getByRole("menuitemcheckbox", { name: "In Progress" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "On Hold" }));

    expect(onSetStatus).toHaveBeenCalledWith("hold");
    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens the status menu on a right-click of the ring", () => {
    const { onSetStatus } = renderRow(task);

    fireEvent.contextMenu(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Cancelled" }));

    expect(onSetStatus).toHaveBeenCalledWith("cancelled");
  });

  it("never flags a cancelled task's past due date as overdue", () => {
    renderRow({ ...task, status: "cancelled", dueDate: "2026-09-01" });
    expect(screen.getByText("Due: 2026-09-01")).toBeInTheDocument();
    expect(screen.queryByText(/Overdue/)).toBeNull();
  });
});
