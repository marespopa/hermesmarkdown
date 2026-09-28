import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Provider, createStore } from "jotai";
import {
  atom_commandUseCounts,
  atom_palettePinnedItems,
  atom_recentCommandIds,
  atom_recentFilePaths,
  atom_userName,
} from "@/app/atoms/ui-atoms";
import ProfileSettings from "./ProfileSettings";

const confirmMock = vi.fn();
vi.mock("@/app/hooks/use-dialog", () => ({
  useDialog: () => ({ confirm: confirmMock }),
}));

const showSuccessToast = vi.fn();
vi.mock("@/app/components/Toastr", () => ({
  showSuccessToast: (message: string) => showSuccessToast(message),
}));

function renderWith(setup: (store: ReturnType<typeof createStore>) => void = () => {}) {
  const store = createStore();
  setup(store);
  render(
    <Provider store={store}>
      <ProfileSettings />
    </Provider>
  );
  return store;
}

function seedHistory(store: ReturnType<typeof createStore>) {
  store.set(atom_recentCommandIds, ["save-file"]);
  store.set(atom_recentFilePaths, ["notes/a.md"]);
  store.set(atom_commandUseCounts, { "save-file": 3 });
  store.set(atom_palettePinnedItems, [{ kind: "command", id: "save-file" }]);
}

describe("ProfileSettings", () => {
  beforeEach(() => {
    confirmMock.mockReset();
    showSuccessToast.mockReset();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("shows the name set in the Welcome wizard", () => {
    renderWith((store) => store.set(atom_userName, "Ada"));
    expect(screen.getByLabelText("Your name")).toHaveProperty("value", "Ada");
  });

  it("updates the name and trims it on blur", () => {
    const store = renderWith((s) => s.set(atom_userName, "Ada"));
    const input = screen.getByLabelText("Your name");
    fireEvent.change(input, { target: { value: "  Grace  " } });
    expect(store.get(atom_userName)).toBe("  Grace  ");
    fireEvent.blur(input);
    expect(store.get(atom_userName)).toBe("Grace");
  });

  it("clears command history after confirming", async () => {
    confirmMock.mockResolvedValue(true);
    const store = renderWith(seedHistory);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    });
    expect(store.get(atom_recentCommandIds)).toEqual([]);
    expect(store.get(atom_recentFilePaths)).toEqual([]);
    expect(store.get(atom_commandUseCounts)).toEqual({});
    expect(store.get(atom_palettePinnedItems)).toEqual([]);
    expect(showSuccessToast).toHaveBeenCalledWith("Command history cleared");
  });

  it("keeps command history when the confirm is cancelled", async () => {
    confirmMock.mockResolvedValue(false);
    const store = renderWith(seedHistory);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    });
    expect(store.get(atom_recentCommandIds)).toEqual(["save-file"]);
    expect(showSuccessToast).not.toHaveBeenCalled();
  });
});
