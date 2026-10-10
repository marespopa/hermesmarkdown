import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Provider } from "jotai";
import type { DisplayTask } from "@/app/atoms/task-atoms";
import { MASKED_TEXT, maskTask } from "@/app/utils/note-display";
import TaskRow from "./TaskRow";

const SECRET = "Wire the secret payment";

const task: DisplayTask = {
  id: "Payroll.md#2", path: "Payroll.md", line: 2, checked: false, inProgress: false, onHold: false,
  dueDate: "2099-12-31", priority: null, tags: ["money"], text: SECRET, raw: `- [ ] ${SECRET} #money`, lineHash: "h",
  isMasked: false,
};

function renderRow(row: DisplayTask) {
  const handlers = { onToggle: vi.fn(), onNavigate: vi.fn() };
  render(
    <Provider>
      <TaskRow task={row} subtitle="Payroll" {...handlers} />
    </Provider>,
  );
  return handlers;
}

describe("TaskRow", () => {
  beforeEach(() => cleanup());

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
    expect(screen.getByText(/2099-12-31/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button"));
    expect(onNavigate).toHaveBeenCalledOnce();
  });
});
