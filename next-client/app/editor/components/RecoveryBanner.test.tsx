import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_content } from "@/app/atoms/atoms";
import { atom_recoveryIssue, LARGE_NOTE_CHARS, type RecoveryIssue } from "@/app/atoms/recovery-atoms";
import RecoveryBanner from "./RecoveryBanner";

const actions = vi.hoisted(() => ({
  exportNote: vi.fn(),
  regrantAccess: vi.fn(),
  chooseVault: vi.fn(),
  freeUpSpace: vi.fn(),
}));

vi.mock("../hooks/use-recovery-actions", () => ({ useRecoveryActions: () => actions }));

function renderWith(issue: RecoveryIssue | null, content = "") {
  const store = createStore();
  store.set(atom_recoveryIssue, issue);
  if (content) store.set(atom_content, content);
  const Wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  Wrapper.displayName = "Wrapper";
  render(<RecoveryBanner />, { wrapper: Wrapper });
  return store;
}

describe("RecoveryBanner", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows nothing when notes can be saved", () => {
    renderWith(null);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("offers to grant access again or export when access is lost", () => {
    renderWith({ kind: "access-lost" });
    expect(screen.getByRole("status")).toHaveTextContent("Hermes lost access to the vault. Your edits are held in memory.");
    fireEvent.click(screen.getByRole("button", { name: "Grant access again" }));
    expect(actions.regrantAccess).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Export file as .md" }));
    expect(actions.exportNote).toHaveBeenCalled();
  });

  it("offers to choose the folder again when the vault went missing", () => {
    renderWith({ kind: "vault-missing" });
    expect(screen.getByRole("status")).toHaveTextContent("moved or deleted");
    fireEvent.click(screen.getByRole("button", { name: "Choose folder" }));
    expect(actions.chooseVault).toHaveBeenCalled();
  });

  it("offers to clear the cache when storage is full, without a dismiss", () => {
    renderWith({ kind: "storage-full" });
    fireEvent.click(screen.getByRole("button", { name: "Clear cache" }));
    expect(actions.freeUpSpace).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
  });

  it("lets a nearly-full warning be dismissed", () => {
    const store = renderWith({ kind: "storage-low", usage: 92, quota: 100 });
    expect(screen.getByRole("status")).toHaveTextContent("Browser storage is 92% full.");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(store.get(atom_recoveryIssue)).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("notes a very large note until dismissed", () => {
    renderWith(null, "x".repeat(LARGE_NOTE_CHARS + 1));
    expect(screen.getByRole("status")).toHaveTextContent("This file is very large");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).toBeNull();
  });
});
