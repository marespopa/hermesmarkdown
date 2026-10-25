import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { describe, expect, it } from "vitest";
import { atom_gitLoading, atom_showGitChanges } from "@/app/atoms/git-atoms";
import GitChangesToggleButton from "./GitChangesToggleButton";

describe("GitChangesToggleButton", () => {
  it("shows and hides the git changes diff, pressed while it's on", () => {
    const store = createStore();
    store.set(atom_showGitChanges, false);
    render(<Provider store={store}><GitChangesToggleButton /></Provider>);
    const button = screen.getByRole("button", { name: "Git Changes" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(button);
    expect(store.get(atom_showGitChanges)).toBe(true);
    expect(button).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(button);
    expect(store.get(atom_showGitChanges)).toBe(false);
  });

  it("is busy while HEAD's text is being read, only when Git Changes is on", () => {
    const store = createStore();
    store.set(atom_showGitChanges, true);
    store.set(atom_gitLoading, 1);
    render(<Provider store={store}><GitChangesToggleButton /></Provider>);
    const button = screen.getByRole("button", { name: "Git Changes" });
    expect(button).toHaveAttribute("aria-busy", "true");

    act(() => store.set(atom_gitLoading, 0));
    expect(button).not.toHaveAttribute("aria-busy");

    act(() => {
      store.set(atom_gitLoading, 1);
      store.set(atom_showGitChanges, false);
    });
    expect(button).not.toHaveAttribute("aria-busy");
  });
});
