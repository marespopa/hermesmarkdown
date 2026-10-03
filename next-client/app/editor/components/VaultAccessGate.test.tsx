import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { atom_isVaultRestoring, atom_isVaultUnlocking } from "@/app/atoms/atoms";
import VaultAccessGate from "./VaultAccessGate";

const vaultManager = vi.hoisted(() => ({ isVaultPending: false, restoreVault: vi.fn() }));
vi.mock("@/app/hooks/file-system/use-vault-manager", () => ({ useVaultManager: () => vaultManager }));

function renderGate({ restoring = false, pending = false, unlocking = false } = {}) {
  vaultManager.isVaultPending = pending;
  const store = createStore();
  store.set(atom_isVaultRestoring, restoring);
  store.set(atom_isVaultUnlocking, unlocking);
  return render(
    <Provider store={store}>
      <VaultAccessGate>
        <button>Route content</button>
      </VaultAccessGate>
    </Provider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("VaultAccessGate", () => {
  it("shows only the editor skeleton while the saved vault is looked up", () => {
    renderGate({ restoring: true });
    expect(screen.queryByText("Route content")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading vault" })).toBeInTheDocument();
  });

  it("keeps the route out of reach behind Restore Access while access is paused", () => {
    renderGate({ pending: true });
    expect(screen.getByText("Route content").closest("[inert]")).not.toBeNull();
    fireEvent.click(screen.getByText("Restore Access"));
    expect(vaultManager.restoreVault).toHaveBeenCalled();
  });

  it("restores access on any key press while access is paused", () => {
    renderGate({ pending: true });
    fireEvent.keyDown(window, { key: "a" });
    expect(vaultManager.restoreVault).toHaveBeenCalledTimes(1);
  });

  it("keeps the route out of reach while the vault loads after access is granted", () => {
    renderGate({ pending: true, unlocking: true });
    expect(screen.getByText("Route content").closest("[inert]")).not.toBeNull();
    expect(screen.getByRole("status", { name: "Loading vault" })).toBeInTheDocument();
    expect(screen.queryByText("Restore Access")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "a" });
    expect(vaultManager.restoreVault).not.toHaveBeenCalled();
  });

  it("ignores gestures once the vault is readable", () => {
    renderGate();
    fireEvent.keyDown(window, { key: "a" });
    fireEvent.click(window);
    expect(vaultManager.restoreVault).not.toHaveBeenCalled();
  });

  it("shows the route once the vault is readable", () => {
    renderGate();
    expect(screen.getByText("Route content").closest("[inert]")).toBeNull();
    expect(screen.queryByText("Restore Access")).not.toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading vault" })).not.toBeInTheDocument();
  });
});
