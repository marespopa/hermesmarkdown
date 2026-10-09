import React from "react";
import { renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { atom_vaultOpenBehaviorAppliedFor, atom_welcomeDeferred } from "@/app/atoms/ui-atoms";
import { buildToolHandoff, HANDOFF_TTL_MS, TOOL_HANDOFF_KEY } from "@/app/utils/tool-handoff";
import { useToolHandoff } from "./use-tool-handoff";
import { NO_VAULT_KEY } from "./use-vault-open-behavior";

function storeHandoff(createdAt = Date.now()) {
  const handoff = buildToolHandoff("mermaid", "Mermaid diagram", "# Mermaid diagram\n", createdAt);
  sessionStorage.setItem(TOOL_HANDOFF_KEY, JSON.stringify(handoff));
}

function setup(appliedFor: string | null, isVaultLocked = false) {
  const store = createStore();
  store.set(atom_vaultOpenBehaviorAppliedFor, appliedFor);
  const offerDraft = vi.fn();
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const hook = renderHook(({ locked }) => useToolHandoff({ offerDraft, isVaultLocked: locked }), {
    wrapper,
    initialProps: { locked: isVaultLocked },
  });
  return { store, offerDraft, ...hook };
}

describe("useToolHandoff", () => {
  afterEach(() => sessionStorage.clear());

  it("does nothing without a handoff", () => {
    const { store, offerDraft } = setup(NO_VAULT_KEY);
    expect(offerDraft).not.toHaveBeenCalled();
    expect(store.get(atom_welcomeDeferred)).toBe(false);
  });

  it("defers the welcome tour and waits while the vault is locked", () => {
    storeHandoff();
    const { store, offerDraft, rerender } = setup(NO_VAULT_KEY, true);
    expect(store.get(atom_welcomeDeferred)).toBe(true);
    expect(offerDraft).not.toHaveBeenCalled();

    rerender({ locked: false });
    expect(offerDraft).toHaveBeenCalledWith({ text: "# Mermaid diagram\n", name: "Mermaid diagram", origin: "tool" });
  });

  it("waits for the vault-open behavior, then offers once and clears the key", () => {
    storeHandoff();
    const { store, offerDraft, rerender } = setup(null);
    expect(offerDraft).not.toHaveBeenCalled();

    store.set(atom_vaultOpenBehaviorAppliedFor, NO_VAULT_KEY);
    rerender({ locked: false });
    expect(offerDraft).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(TOOL_HANDOFF_KEY)).toBeNull();

    rerender({ locked: false });
    expect(offerDraft).toHaveBeenCalledTimes(1);
  });

  it("drops an expired handoff", () => {
    storeHandoff(Date.now() - HANDOFF_TTL_MS - 1000);
    const { offerDraft } = setup(NO_VAULT_KEY);
    expect(offerDraft).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(TOOL_HANDOFF_KEY)).toBeNull();
  });
});
