import React from "react";
import { act, render } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { describe, expect, it } from "vitest";
import { atom_vaultDescriptor, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useVaultSwitchFade } from "./use-vault-switch-fade";

function Probe() {
  const ref = useVaultSwitchFade<HTMLDivElement>();
  return <div ref={ref} data-testid="probe" />;
}

const open = (store: ReturnType<typeof createStore>, name: string | null) => {
  store.set(atom_vaultDescriptor, name ? { kind: "local" } : null);
  store.set(atom_vaultHandle, name ? ({ name } as FileSystemDirectoryHandle) : null);
};

describe("useVaultSwitchFade", () => {
  it("fades on a switch between vaults, not on first open or close", () => {
    const store = createStore();
    const { getByTestId } = render(<Provider store={store}><Probe /></Provider>);
    const probe = getByTestId("probe");
    act(() => open(store, "A"));
    expect(probe).not.toHaveClass("vault-switch-in");
    act(() => open(store, "B"));
    expect(probe).toHaveClass("vault-switch-in");
    probe.dispatchEvent(new Event("animationend"));
    expect(probe).not.toHaveClass("vault-switch-in");
    act(() => open(store, null));
    expect(probe).not.toHaveClass("vault-switch-in");
  });
});
