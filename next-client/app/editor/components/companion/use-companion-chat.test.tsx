import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_companionProposals } from "@/app/atoms/companion-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { companionChat } from "./companion-chat-store";
import { useCompanionChat } from "./use-companion-chat";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("./use-companion-tools", () => ({ useCompanionTools: () => ({ runTool: vi.fn(), undoTurn: vi.fn() }) }));

const vault = (name: string, same = false) =>
  ({ name, isSameEntry: async () => same }) as unknown as FileSystemDirectoryHandle;
const message = { id: "m1", role: "user", parts: [{ type: "text", text: "hi" }] } as never;

function setup(first: FileSystemDirectoryHandle) {
  const store = createStore();
  store.set(atom_vaultHandle, first);
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  renderHook(() => useCompanionChat(), { wrapper });
  return store;
}

describe("useCompanionChat vault switch", () => {
  beforeEach(() => {
    localStorage.clear();
    companionChat().messages = [];
  });

  it("starts a fresh chat and drops proposals when a different vault opens", async () => {
    const store = setup(vault("A"));
    act(() => { companionChat().messages = [message]; store.set(atom_companionProposals, [{ id: "p1" } as never]); });
    act(() => store.set(atom_vaultHandle, vault("B")));
    await waitFor(() => expect(companionChat().messages).toEqual([]));
    expect(store.get(atom_companionProposals)).toEqual([]);
  });

  it("keeps the chat when the same vault is reopened", async () => {
    const store = setup(vault("A", true));
    // The thread's vault outlives each test; let the first mount settle on A.
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    act(() => { companionChat().messages = [message]; });
    act(() => store.set(atom_vaultHandle, vault("A")));
    await new Promise((r) => setTimeout(r, 20));
    expect(companionChat().messages).toHaveLength(1);
  });
});
