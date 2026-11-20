import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VaultPendingOverlay from "./VaultPendingOverlay";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("VaultPendingOverlay", () => {
  it("restores access from its one button", () => {
    const restoreVault = vi.fn();
    render(<VaultPendingOverlay restoreVault={restoreVault} />);
    fireEvent.click(screen.getByRole("button", { name: "Restore Access" }));
    expect(restoreVault).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});
