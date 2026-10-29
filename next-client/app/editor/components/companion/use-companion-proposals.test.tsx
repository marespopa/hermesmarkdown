import React from "react";
import { renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom_companionProposals } from "@/app/atoms/companion-atoms";
import { act } from "@testing-library/react";
import { useCompanionProposals } from "./use-companion-proposals";

const readCurrentText = vi.fn();
vi.mock("@/app/hooks/file-system/use-note-buffer", () => ({ useNoteBuffer: () => ({ readCurrentText }) }));
const writeFile = vi.fn();
vi.mock("./use-companion-writes", () => ({
  useCompanionWrites: () => ({ writeFile, createFile: vi.fn(), createPlan: vi.fn(), createTemplate: vi.fn() }),
}));

function setup() {
  const store = createStore();
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(() => useCompanionProposals(), { wrapper });
  return { proposals: result.current, store };
}

describe("useCompanionProposals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("only treats a NotFoundError as a missing file when proposing a new file", async () => {
    readCurrentText.mockRejectedValue(Object.assign(new Error("not found"), { name: "NotFoundError" }));
    const { proposals, store } = setup();

    const result = await proposals.createFile("turn", "New.md", "Hello");

    expect(result.detail).toBe("proposed");
    expect(store.get(atom_companionProposals)).toHaveLength(1);
  });

  it("surfaces other read failures and creates no proposal", async () => {
    readCurrentText.mockRejectedValue(new Error("permission denied"));
    const { proposals, store } = setup();

    const result = await proposals.writeFile("turn", "Note.md", "Hello");

    expect(result).toMatchObject({ detail: "read failed", output: expect.stringContaining("permission denied") });
    expect(store.get(atom_companionProposals)).toHaveLength(0);
  });

  it("writes nothing when proposing, and writes only accepted hunks on apply", async () => {
    readCurrentText.mockResolvedValue("one\ntwo\n");
    writeFile.mockResolvedValue({ output: "Saved", detail: "rewritten" });
    const { proposals, store } = setup();

    await proposals.writeFile("turn", "Note.md", "ONE\nTWO\n");
    expect(writeFile).not.toHaveBeenCalled();
    const proposal = store.get(atom_companionProposals)[0];
    act(() => proposals.setHunkStatus(proposal.id, proposal.hunks[0].id, "accepted"));
    await proposals.apply(store.get(atom_companionProposals)[0]);

    expect(writeFile).toHaveBeenCalledWith("turn", "Note.md", "ONE\nTWO\n");
    expect(store.get(atom_companionProposals)).toHaveLength(0);
  });

  it("refuses to apply over a note that changed since the proposal", async () => {
    readCurrentText.mockResolvedValueOnce("one\n").mockResolvedValueOnce("edited\n");
    const { proposals, store } = setup();

    await proposals.writeFile("turn", "Note.md", "ONE\n");
    const proposal = store.get(atom_companionProposals)[0];
    act(() => proposals.setHunkStatus(proposal.id, proposal.hunks[0].id, "accepted"));
    const result = await proposals.apply(store.get(atom_companionProposals)[0]);

    expect(result.detail).toBe("stale");
    expect(writeFile).not.toHaveBeenCalled();
    expect(store.get(atom_companionProposals)).toHaveLength(1);
  });

  it("discards a proposal without writing", async () => {
    readCurrentText.mockResolvedValue("one\n");
    const { proposals, store } = setup();

    await proposals.writeFile("turn", "Note.md", "ONE\n");
    act(() => proposals.discard(store.get(atom_companionProposals)[0].id));

    expect(store.get(atom_companionProposals)).toHaveLength(0);
    expect(writeFile).not.toHaveBeenCalled();
  });
});
