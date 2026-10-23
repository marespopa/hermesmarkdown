import React from "react";
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import toast from "react-hot-toast";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { useOpenFileLink } from "./use-open-file-link";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("react-hot-toast", () => ({ default: { error: vi.fn() } }));

function setup() {
  const store = createStore();
  const handle = { name: "README.md" };
  store.set(atom_fileMetadata, {
    "app/editor/README.md": { path: "app/editor/README.md", name: "README.md", handle } as unknown as FileMetadata,
  });
  const openFile = vi.fn(async () => {});
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  const { result } = renderHook(() => useOpenFileLink({ openFile }), { wrapper });
  return { handle, openFile, openFileLink: result.current.openFileLink };
}

describe("useOpenFileLink", () => {
  it("opens the vault file a relative link points to from the linking note", async () => {
    const { handle, openFile, openFileLink } = setup();
    await act(() => openFileLink("./app/editor/README.md", "README.md"));
    expect(openFile).toHaveBeenCalledWith(handle, "app/editor/README.md");
  });

  it("says so, and creates nothing, when the path isn't in the vault", async () => {
    const { openFile, openFileLink } = setup();
    await act(() => openFileLink("./app/missing.md", "README.md"));
    expect(openFile).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("./app/missing.md isn't in the vault.");
  });
});
