import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VaultPendingOverlay from "./VaultPendingOverlay";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("VaultPendingOverlay", () => {
  afterEach(() => vi.restoreAllMocks());

  it("restores access from its button", () => {
    const restoreVault = vi.fn();
    render(<VaultPendingOverlay restoreVault={restoreVault} chooseFolder={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Restore Access" }));
    expect(restoreVault).toHaveBeenCalledTimes(1);
  });

  it("chooses a folder instead, without the gate's click or key listeners taking it for a restore", () => {
    const restoreVault = vi.fn();
    const chooseFolder = vi.fn();
    // What VaultAccessGate listens with while the vault is pending.
    window.addEventListener("click", restoreVault);
    window.addEventListener("keydown", restoreVault);
    render(<VaultPendingOverlay restoreVault={restoreVault} chooseFolder={chooseFolder} />);
    const button = screen.getByRole("button", { name: "Choose Folder…" });

    fireEvent.click(button);
    fireEvent.keyDown(button, { key: "Enter" });

    expect(chooseFolder).toHaveBeenCalledTimes(1);
    expect(restoreVault).not.toHaveBeenCalled();
    window.removeEventListener("click", restoreVault);
    window.removeEventListener("keydown", restoreVault);
  });
});
