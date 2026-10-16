import React from "react";
import { renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atom_vaultOpenBehaviorAppliedFor } from "@/app/atoms/ui-atoms";
import { buildToolHandoff, TOOL_HANDOFF_KEY } from "@/app/utils/tool-handoff";
import { useWelcomeNote } from "./use-welcome-note";
import { NO_VAULT_KEY } from "./use-vault-open-behavior";

function setup(appliedFor: string | null, isVaultLocked = false) {
  const store = createStore();
  store.set(atom_vaultOpenBehaviorAppliedFor, appliedFor);
  const offerDraft = vi.fn();
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const hook = renderHook(
    ({ locked }) => useWelcomeNote({ offerDraft, isVaultLocked: locked, isMobileChrome: false }),
    { wrapper, initialProps: { locked: isVaultLocked } },
  );
  return { store, offerDraft, ...hook };
}

describe("useWelcomeNote", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => sessionStorage.clear());

  it("opens the Welcome note in the draft on a first visit", () => {
    const { offerDraft } = setup(NO_VAULT_KEY);
    expect(offerDraft).toHaveBeenCalledTimes(1);
    expect(offerDraft).toHaveBeenCalledWith(expect.objectContaining({ name: "Welcome", text: expect.stringMatching(/^# Welcome/) }));
  });

  it("does nothing after the first visit", () => {
    localStorage.setItem("hasCompletedOnboarding", "true");
    const { offerDraft } = setup(NO_VAULT_KEY);
    expect(offerDraft).not.toHaveBeenCalled();
  });

  it("waits for the vault to settle and the vault-open behavior to run", () => {
    const { offerDraft, store, rerender } = setup(null, true);
    expect(offerDraft).not.toHaveBeenCalled();
    rerender({ locked: false });
    expect(offerDraft).not.toHaveBeenCalled();
    store.set(atom_vaultOpenBehaviorAppliedFor, NO_VAULT_KEY);
    rerender({ locked: false });
    expect(offerDraft).toHaveBeenCalledTimes(1);
  });

  it("leaves the draft to work handed over from a tool page", () => {
    const handoff = buildToolHandoff("mermaid", "Mermaid diagram", "# Mermaid diagram\n", Date.now());
    sessionStorage.setItem(TOOL_HANDOFF_KEY, JSON.stringify(handoff));
    const { offerDraft } = setup(NO_VAULT_KEY);
    expect(offerDraft).not.toHaveBeenCalled();
  });
});
