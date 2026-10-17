import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import TasksPage from "./page";

const push = vi.fn();
const openFile = vi.fn();
const setPendingScrollTarget = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("jotai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("jotai")>()),
  useSetAtom: () => setPendingScrollTarget,
}));
vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: () => ({ openFile }) }));
vi.mock("./components/TasksList", () => ({
  default: ({ onFileSelect }: { onFileSelect: (handle: FileSystemFileHandle, path: string, line: number) => void }) => (
    <button type="button" onClick={() => onFileSelect({ name: "note.md" } as FileSystemFileHandle, "note.md", 4)}>
      Open task
    </button>
  ),
}));

describe("TasksPage", () => {
  it("goes back to the editor from its title bar", () => {
    render(<TasksPage />);
    fireEvent.click(screen.getByTitle("Back to editor"));
    expect(push).toHaveBeenCalledWith("/editor");
  });

  it("opens a selected task's note at its URL in the editor", () => {
    render(<TasksPage />);

    fireEvent.click(screen.getByRole("button", { name: "Open task" }));
    expect(openFile).toHaveBeenCalledWith({ name: "note.md" }, "note.md");
    expect(setPendingScrollTarget).toHaveBeenCalledWith({ path: "note.md", line: 4 });
    expect(push).toHaveBeenLastCalledWith("/editor?file=note.md");
  });
});
