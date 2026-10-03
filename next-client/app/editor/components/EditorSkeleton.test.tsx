import { cleanup, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, describe, expect, it } from "vitest";
import { atom_onVaultOpen, type VaultOpenBehavior } from "@/app/atoms/ui-atoms";
import EditorSkeleton from "./EditorSkeleton";

function renderSkeleton(onVaultOpen: VaultOpenBehavior = "home") {
  const store = createStore();
  store.set(atom_onVaultOpen, onVaultOpen);
  return render(
    <Provider store={store}>
      <EditorSkeleton />
    </Provider>,
  );
}

afterEach(() => {
  cleanup();
});

describe("EditorSkeleton", () => {
  it("announces that the vault is loading", () => {
    renderSkeleton();
    expect(screen.getByRole("status", { name: "Loading vault" })).toBeInTheDocument();
    expect(screen.getByText("Loading your vault…")).toBeInTheDocument();
  });


  it("outlines the home feed, with today's date, when vaults open on Home", () => {
    renderSkeleton("home");
    const weekday = new Date().toLocaleDateString(undefined, { weekday: "long" });
    expect(screen.getByText(weekday)).toBeInTheDocument();
  });

  it("outlines the workspace when vaults resume their tabs", () => {
    renderSkeleton("resume");
    const weekday = new Date().toLocaleDateString(undefined, { weekday: "long" });
    expect(screen.queryByText(weekday)).not.toBeInTheDocument();
  });
});
