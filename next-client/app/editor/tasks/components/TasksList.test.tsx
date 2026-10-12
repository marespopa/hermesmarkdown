import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_taskView } from "@/app/atoms/ui-atoms";
import { extractTasks } from "@/app/utils/taskExtractor";
import TasksList from "./TasksList";
import { LINGER_MS } from "./use-task-linger";

const writeback = vi.hoisted(() => ({
  setTaskStatus: vi.fn(),
  restoreTaskLine: vi.fn(),
  toggleTask: vi.fn(),
}));
vi.mock("@/app/hooks/use-task-writeback", () => ({ useTaskWriteback: () => writeback }));

const showUndoToast = vi.hoisted(() => vi.fn());
vi.mock("@/app/hooks/file-system/undo-toast", () => ({ showUndoToast }));

const NOTE = "- [ ] Ship report\n- [ ] Draft roadmap\n";
const CHANGE = { path: "work.md", line: 0, before: "- [ ] Ship report", after: "- [x] Ship report @done(2026-10-12)" };

function renderList() {
  const store = createStore();
  const meta: FileMetadata = {
    path: "work.md", name: "work.md", tags: [], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 0,
    tasks: extractTasks("work.md", NOTE), handle: null,
  };
  store.set(atom_fileMetadata, { "work.md": meta });
  store.set(atom_taskView, "all");
  render(
    <Provider store={store}>
      <TasksList onFileSelect={vi.fn()} />
    </Provider>,
  );
  return store;
}

describe("TasksList status changes", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date(2026, 9, 12, 9, 0));
    writeback.setTaskStatus.mockResolvedValue(CHANGE);
    writeback.restoreTaskLine.mockResolvedValue(null);
    showUndoToast.mockClear();
    window.localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("completes a task in place, then offers Undo that restores its line", async () => {
    renderList();
    const toDo = screen.getByRole("region", { name: "To Do" });
    const ring = within(toDo).getAllByRole("checkbox")[0];

    await act(async () => {
      fireEvent.click(ring);
    });

    expect(writeback.setTaskStatus).toHaveBeenCalledWith(expect.objectContaining({ text: "Ship report" }), "done");
    // Still in To Do, now showing as done, until the beat is over.
    expect(within(toDo).getAllByRole("checkbox")[0]).toHaveAttribute("aria-checked", "true");
    expect(within(toDo).getByText("Ship report")).toBeInTheDocument();

    expect(showUndoToast).toHaveBeenCalledWith("Completed “Ship report”", expect.any(Function), { id: "task-status" });
    showUndoToast.mock.calls[0][1]();
    expect(writeback.restoreTaskLine).toHaveBeenCalledWith(CHANGE);

    act(() => vi.advanceTimersByTime(LINGER_MS));
  });

  it("sets a status from the row menu and names it in the toast", async () => {
    renderList();
    fireEvent.click(screen.getAllByRole("button", { name: "Change status" })[1]);
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "On Hold" }));
    });
    expect(writeback.setTaskStatus).toHaveBeenCalledWith(expect.objectContaining({ text: "Draft roadmap" }), "hold");
    expect(showUndoToast).toHaveBeenCalledWith("Put on hold “Draft roadmap”", expect.any(Function), { id: "task-status" });
  });

  it("offers no Undo when the write fails", async () => {
    writeback.setTaskStatus.mockResolvedValue(null);
    renderList();
    await act(async () => {
      fireEvent.click(screen.getAllByRole("checkbox")[0]);
    });
    expect(showUndoToast).not.toHaveBeenCalled();
  });
});
