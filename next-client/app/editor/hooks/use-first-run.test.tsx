import React from "react";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_renderedFontSize } from "@/app/atoms/atoms";
import { atom_fullWidth } from "@/app/atoms/ui-atoms";
import { atom_isVaultRestoring } from "@/app/atoms/vault-atoms";
import { showHintToast } from "@/app/components/Toastr";
import { FIRST_RUN_TEXT_SIZE, isFirstRun, useFirstRun } from "./use-first-run";

vi.mock("@/app/components/Toastr", () => ({ showHintToast: vi.fn() }));

function setup(restoring = false) {
  const store = createStore();
  store.set(atom_isVaultRestoring, restoring);
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const hook = renderHook(() => useFirstRun(false), { wrapper });
  return { store, ...hook };
}

describe("useFirstRun", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("on a first visit, applies Medium text and full width and shows the palette shortcut once", () => {
    const { store, rerender } = setup();
    expect(store.get(atom_renderedFontSize)).toBe(FIRST_RUN_TEXT_SIZE);
    expect(localStorage.getItem("fullWidth")).toBe("true");
    expect(store.get(atom_fullWidth)).toBe(true);
    expect(showHintToast).toHaveBeenCalledTimes(1);
    expect(vi.mocked(showHintToast).mock.calls[0][0]).toMatch(/anytime to open the command palette/);
    expect(isFirstRun()).toBe(false);

    rerender();
    expect(showHintToast).toHaveBeenCalledTimes(1);
  });

  it("shows the palette shortcut once under Strict Mode's double effect run", () => {
    const store = createStore();
    store.set(atom_isVaultRestoring, false);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <Provider store={store}>{children}</Provider>
      </React.StrictMode>
    );
    renderHook(() => useFirstRun(false), { wrapper });
    expect(showHintToast).toHaveBeenCalledTimes(1);
  });

  it("keeps a text size and width already chosen", () => {
    localStorage.setItem("renderedFontSize", JSON.stringify("21px"));
    localStorage.setItem("fullWidth", JSON.stringify(false));
    setup();
    expect(localStorage.getItem("renderedFontSize")).toBe(JSON.stringify("21px"));
    expect(localStorage.getItem("fullWidth")).toBe("false");
  });

  it("waits while the saved vault is restoring", () => {
    setup(true);
    expect(showHintToast).not.toHaveBeenCalled();
    expect(isFirstRun()).toBe(true);
  });

  it("does nothing for a returning visitor", () => {
    localStorage.setItem("hasCompletedOnboarding", "true");
    setup();
    expect(showHintToast).not.toHaveBeenCalled();
    expect(localStorage.getItem("fullWidth")).toBeNull();
  });
});
