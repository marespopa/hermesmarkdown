import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import { atom_isRequestingAccess, atom_isVaultRestoring, atom_isVaultUnlocking } from "@/app/atoms/atoms";
import { STARTUP_STUCK_MS } from "../hooks/use-startup-watchdog";
import VaultAccessGate from "./VaultAccessGate";

const vaultManager = vi.hoisted(() => ({
  isVaultPending: false,
  restoreVault: vi.fn(async (): Promise<string> => "busy"),
  openVault: vi.fn(async () => true),
  vaultHandle: null as unknown,
}));
const recents = vi.hoisted(() => ({
  recentVaults: [{ key: "local:work", name: "Work", kind: "local", handle: {} }],
  openRecentVault: vi.fn(async () => true),
}));
vi.mock("../hooks/use-recent-vaults", () => ({ useRecentVaults: () => recents }));
const toasts = vi.hoisted(() => ({ showActionToast: vi.fn() }));
vi.mock("@/app/components/Toastr", () => ({ showActionToast: toasts.showActionToast }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/editor" }));
vi.mock("@/app/hooks/file-system/use-vault-manager", () => ({ useVaultManager: () => vaultManager }));

function renderGate({ restoring = false, pending = false, unlocking = false, requesting = false } = {}) {
  vaultManager.isVaultPending = pending;
  const store = createStore();
  store.set(atom_isVaultRestoring, restoring);
  store.set(atom_isVaultUnlocking, unlocking);
  store.set(atom_isRequestingAccess, requesting);
  return render(
    <Provider store={store}>
      <VaultAccessGate>
        <button>Route content</button>
      </VaultAccessGate>
    </Provider>,
  );
}

afterEach(() => {
  vi.useRealTimers();
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

  it("ignores Tab, so the screen can be tabbed through", () => {
    renderGate({ pending: true });
    fireEvent.keyDown(window, { key: "Tab" });
    expect(vaultManager.restoreVault).not.toHaveBeenCalled();
  });

  it("opens another vault without asking for the paused one", () => {
    renderGate({ pending: true });
    fireEvent.click(screen.getByRole("button", { name: "Work" }));
    expect(recents.openRecentVault).toHaveBeenCalledWith(recents.recentVaults[0]);
    fireEvent.click(screen.getByRole("button", { name: "Open Folder…" }));
    expect(vaultManager.openVault).toHaveBeenCalledTimes(1);
    expect(vaultManager.restoreVault).not.toHaveBeenCalled();
  });

  it("says so when the ask is refused", async () => {
    vaultManager.restoreVault.mockResolvedValueOnce("denied");
    renderGate({ pending: true });
    await act(async () => { fireEvent.keyDown(window, { key: "a" }); });
    expect(screen.getByRole("status")).toHaveTextContent("Access wasn't allowed");
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

  it("offers a reload when the skeleton stays up while access is being requested", () => {
    vi.useFakeTimers();
    renderGate({ restoring: true, requesting: true });
    act(() => { vi.advanceTimersByTime(STARTUP_STUCK_MS); });
    expect(toasts.showActionToast).toHaveBeenCalledWith("Still opening your notes…", "Reload", expect.any(Function));
  });
});
