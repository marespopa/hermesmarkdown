import React from "react";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom_activePaneId, atom_openFiles, atom_workspaceLayout } from "@/app/atoms/atoms";
import { EMPTY_DRAFT } from "@/app/atoms/file-atoms";
import { atom_homeFeedOpen } from "@/app/atoms/ui-atoms";
import { useDraftImport } from "./use-draft-import";

const toast = vi.hoisted(() => vi.fn());
vi.mock("react-hot-toast", () => ({ default: toast }));
vi.mock("../utils/focus-pane-editor", () => ({ focusPaneEditorWhenReady: vi.fn() }));

const NOTE = "notes/a.md";

function setup({ draft = "", noteActive = false } = {}) {
  const store = createStore();
  store.set(atom_openFiles, {
    draft: { ...EMPTY_DRAFT, content: draft },
    [NOTE]: { ...EMPTY_DRAFT, content: "My note", lastSavedContent: "My note", fileName: "a", activeFilePath: NOTE },
  });
  store.set(atom_workspaceLayout, {
    rootContainer: {
      id: "pane", type: "editor", isPinned: false,
      openFilePaths: noteActive ? [NOTE] : ["draft"],
      activeFilePath: noteActive ? NOTE : "draft",
    },
  });
  store.set(atom_activePaneId, "pane");
  store.set(atom_homeFeedOpen, true);
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(() => useDraftImport(vi.fn()), { wrapper });
  return { store, result };
}

const activeFilePath = (store: ReturnType<typeof createStore>) =>
  (store.get(atom_workspaceLayout).rootContainer as { activeFilePath: string | null }).activeFilePath;

describe("useDraftImport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fills an empty draft, shows it and closes the home feed", () => {
    const { store, result } = setup({ noteActive: true });
    act(() => result.current.offerDraft({ text: "# Table", name: "Markdown table", origin: "tool" }));
    expect(store.get(atom_openFiles).draft).toMatchObject({ content: "# Table", fileName: "Markdown table" });
    expect(activeFilePath(store)).toBe("draft");
    expect(store.get(atom_homeFeedOpen)).toBe(false);
  });

  it("asks before replacing a draft with text", () => {
    const { store, result } = setup({ draft: "Keep me" });
    act(() => result.current.offerDraft({ text: "New", name: "New", origin: "file" }));
    expect(result.current.pendingDraft).toEqual({ text: "New", name: "New", origin: "file" });
    expect(store.get(atom_openFiles).draft.content).toBe("Keep me");

    act(() => result.current.confirmPendingDraft());
    expect(store.get(atom_openFiles).draft.content).toBe("New");
    expect(result.current.pendingDraft).toBeNull();
  });

  it("keeps the draft on cancel, with a toast only for tool work", () => {
    const { store, result } = setup({ draft: "Keep me" });
    act(() => result.current.offerDraft({ text: "New", name: "New", origin: "file" }));
    act(() => result.current.cancelPendingDraft());
    expect(toast).not.toHaveBeenCalled();

    act(() => result.current.offerDraft({ text: "New", name: "New", origin: "tool" }));
    act(() => result.current.cancelPendingDraft());
    expect(toast).toHaveBeenCalledWith("Kept your current draft.");
    expect(store.get(atom_openFiles).draft.content).toBe("Keep me");
    expect(result.current.pendingDraft).toBeNull();
  });

  it("never writes an import into the open vault note", () => {
    const { store, result } = setup({ draft: "Draft text", noteActive: true });
    act(() => result.current.offerDraft({ text: "Imported", name: "b", origin: "file" }));
    act(() => result.current.confirmPendingDraft());
    expect(store.get(atom_openFiles)[NOTE].content).toBe("My note");
    expect(store.get(atom_openFiles).draft.content).toBe("Imported");
  });
});
