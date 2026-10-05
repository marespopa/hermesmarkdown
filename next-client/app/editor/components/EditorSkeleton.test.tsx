import { cleanup, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, describe, expect, it } from "vitest";
import { atom_vaultOpenBehaviorAppliedFor } from "@/app/atoms/ui-atoms";
import EditorSkeleton from "./EditorSkeleton";

// `appliedFor`: the vault this tab already opened (set on a refresh).
function renderSkeleton(appliedFor: string | null = null) {
  const store = createStore();
  store.set(atom_vaultOpenBehaviorAppliedFor, appliedFor);
  return render(
    <Provider store={store}>
      <EditorSkeleton />
    </Provider>,
  );
}

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe("EditorSkeleton", () => {
  it("announces that the vault is loading", () => {
    renderSkeleton();
    expect(screen.getByRole("status", { name: "Loading vault" })).toBeInTheDocument();
    expect(screen.getByText("Loading your vault…")).toBeInTheDocument();
  });

  it("outlines the home feed, with today's date, when a vault opens", () => {
    renderSkeleton();
    const weekday = new Date().toLocaleDateString(undefined, { weekday: "long" });
    expect(screen.getByText(weekday)).toBeInTheDocument();
  });

  it("outlines the vault bar, week strip and note rows on the home feed", () => {
    renderSkeleton();
    expect(screen.getByTestId("feed-vault-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("week-strip-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("feed-skeleton").querySelectorAll("[data-skeleton-row]")).toHaveLength(5);
  });

  it("outlines the workspace on a refresh of a tab that was on a note", () => {
    renderSkeleton("local:Notes");
    const weekday = new Date().toLocaleDateString(undefined, { weekday: "long" });
    expect(screen.queryByText(weekday)).not.toBeInTheDocument();
  });

  it("outlines the home feed when the tab was on the no-vault feed", () => {
    renderSkeleton("no-vault");
    const weekday = new Date().toLocaleDateString(undefined, { weekday: "long" });
    expect(screen.getByText(weekday)).toBeInTheDocument();
  });
});
