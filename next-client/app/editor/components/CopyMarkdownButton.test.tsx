import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { atom_activePaneId, atom_fileContent, atom_workspaceLayout } from "@/app/atoms/atoms";
import CopyMarkdownButton from "./CopyMarkdownButton";

const toasts = vi.hoisted(() => ({ copy: vi.fn(), error: vi.fn() }));

vi.mock("@/app/components/Toastr", () => ({
  showCopyToast: toasts.copy,
  showErrorToast: toasts.error,
}));

const writeText = vi.fn();

function renderWith(paths: string[], content = "") {
  const store = createStore();
  store.set(atom_workspaceLayout, {
    version: 2,
    rootContainer: { id: "pane", openFilePaths: paths, activeFilePath: paths[0], isPinned: false },
  });
  store.set(atom_activePaneId, "pane");
  if (paths[0]) store.set(atom_fileContent(paths[0]), content);
  render(
    <Provider store={store}>
      <CopyMarkdownButton />
    </Provider>,
  );
  return screen.getByRole("button", { name: "Copy Markdown" });
}

describe("CopyMarkdownButton", () => {
  beforeEach(() => {
    writeText.mockReset();
    toasts.copy.mockReset();
    toasts.error.mockReset();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  });

  it("copies the active note's Markdown", async () => {
    writeText.mockResolvedValue(undefined);
    fireEvent.click(renderWith(["Release plan.md"], "# Release plan\n\n- [ ] Ship"));
    await waitFor(() => expect(toasts.copy).toHaveBeenCalledOnce());
    expect(writeText).toHaveBeenCalledWith("# Release plan\n\n- [ ] Ship");
  });

  it("says so when the clipboard refuses", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    fireEvent.click(renderWith(["Release plan.md"], "Draft"));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith("Failed to copy markdown"));
  });

  it("is disabled without a note", () => {
    expect(renderWith([])).toBeDisabled();
  });

  it("is disabled for an empty note", () => {
    expect(renderWith(["Empty.md"], "")).toBeDisabled();
  });
});
