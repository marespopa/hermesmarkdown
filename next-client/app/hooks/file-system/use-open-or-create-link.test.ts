import React from "react";
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { useOpenOrCreateLink } from "./use-open-or-create-link";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function setup() {
  const store = createStore();
  const handle = { name: "plan.md" };
  store.set(atom_fileMetadata, {
    "notes/plan.md": { path: "notes/plan.md", name: "plan.md", handle } as unknown as FileMetadata,
  });
  const openFile = vi.fn(async () => {});
  const createNoteFromMissingLink = vi.fn(async () => {});
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  const { result } = renderHook(() => useOpenOrCreateLink({ openFile, createNoteFromMissingLink }), { wrapper });
  return { handle, openFile, createNoteFromMissingLink, openOrCreateLink: result.current.openOrCreateLink };
}

describe("useOpenOrCreateLink", () => {
  it("opens the note a link resolves to", async () => {
    const { handle, openFile, createNoteFromMissingLink, openOrCreateLink } = setup();
    await act(() => openOrCreateLink("plan|The plan"));
    expect(openFile).toHaveBeenCalledWith(handle, "notes/plan.md");
    expect(createNoteFromMissingLink).not.toHaveBeenCalled();
  });

  it("opens the note a heading link points to", async () => {
    const { handle, openFile, createNoteFromMissingLink, openOrCreateLink } = setup();
    await act(() => openOrCreateLink("plan#Goals"));
    expect(openFile).toHaveBeenCalledWith(handle, "notes/plan.md");
    expect(createNoteFromMissingLink).not.toHaveBeenCalled();
  });

  it("starts the create flow for a missing link", async () => {
    const { openFile, createNoteFromMissingLink, openOrCreateLink } = setup();
    await act(() => openOrCreateLink("rfcs/auth-spec"));
    expect(createNoteFromMissingLink).toHaveBeenCalledWith("rfcs/auth-spec");
    expect(openFile).not.toHaveBeenCalled();
  });
});
