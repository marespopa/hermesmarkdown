import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_taskView } from "@/app/atoms/ui-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
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

const toastError = vi.hoisted(() => vi.fn());
vi.mock("react-hot-toast", () => ({ default: { error: toastError } }));

const NOTE = "- [ ] Ship report\n- [ ] Draft roadmap\n";
const CHANGE = { path: "work.md", line: 0, before: "- [ ] Ship report", after: "- [x] Ship report @done(2026-10-12)" };

function renderList(view: "all" | "board" = "all", vault: FileSystemDirectoryHandle | null = null) {
  const store = createStore();
  const meta: FileMetadata = {
    path: "work.md", name: "work.md", tags: [], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 0,
    tasks: extractTasks("work.md", NOTE), handle: null,
  };
  store.set(atom_fileMetadata, { "work.md": meta });
  store.set(atom_taskView, view);
  store.set(atom_vaultHandle, vault);
  const onFileSelect = vi.fn();
  render(
    <Provider store={store}>
      <TasksList onFileSelect={onFileSelect} />
    </Provider>,
  );
  return { store, onFileSelect };
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

describe("TasksList board", () => {
  beforeEach(() => {
    writeback.setTaskStatus.mockResolvedValue(CHANGE);
    showUndoToast.mockClear();
    writeback.setTaskStatus.mockClear();
    window.localStorage.clear();
  });
  afterEach(cleanup);

  it("shows a column per status, empty ones included", () => {
    renderList("board");
    for (const name of ["To Do", "In Progress", "On Hold", "Done"]) expect(screen.getByRole("region", { name })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Cancelled" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "To Do" })).getByText("Ship report")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "On Hold" })).getByText("No tasks")).toBeInTheDocument();
  });

  it("sets the status of a card dropped on another column", async () => {
    renderList("board");
    const card = screen.getByText("Ship report").closest("[draggable]")!;
    const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
    fireEvent.dragStart(card, { dataTransfer });
    const column = screen.getByTestId("board-column-prog");
    fireEvent.dragOver(column, { dataTransfer });
    await act(async () => {
      fireEvent.drop(column, { dataTransfer });
    });
    expect(writeback.setTaskStatus).toHaveBeenCalledWith(expect.objectContaining({ text: "Ship report" }), "prog");
    expect(showUndoToast).toHaveBeenCalledWith("Started “Ship report”", expect.any(Function), { id: "task-status" });
  });
});

describe("TasksList opening a task's note", () => {
  beforeEach(() => {
    toastError.mockClear();
    window.localStorage.clear();
  });
  afterEach(cleanup);

  it("finds the note in the vault when its metadata has no handle", async () => {
    const fileHandle = { kind: "file", name: "work.md" };
    const vault = { getFileHandle: vi.fn(async () => fileHandle), getDirectoryHandle: vi.fn() } as unknown as FileSystemDirectoryHandle;
    const { onFileSelect } = renderList("all", vault);
    await act(async () => {
      fireEvent.click(screen.getByText("Ship report"));
    });
    expect(onFileSelect).toHaveBeenCalledWith(fileHandle, "work.md", 0);
  });

  it("says so when the note can't be found", async () => {
    const { onFileSelect } = renderList("all", null);
    await act(async () => {
      fireEvent.click(screen.getByText("Ship report"));
    });
    expect(onFileSelect).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("Couldn't find this task's note");
  });
});
