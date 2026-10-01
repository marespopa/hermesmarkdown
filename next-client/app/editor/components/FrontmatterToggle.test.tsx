import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_activeFileHasFrontmatter, atom_frontmatterCollapsedByDefault } from "@/app/atoms/ui-atoms";
import FrontmatterToggle from "./FrontmatterToggle";

function setup(hasFrontmatter: boolean, collapsed: boolean) {
  const store = createStore();
  store.set(atom_activeFileHasFrontmatter, hasFrontmatter);
  store.set(atom_frontmatterCollapsedByDefault, collapsed);
  render(
    <Provider store={store}>
      <FrontmatterToggle />
    </Provider>,
  );
  return store;
}

describe("FrontmatterToggle", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("is hidden when the active file has no frontmatter", () => {
    setup(false, true);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows metadata app-wide when collapsed", () => {
    const store = setup(true, true);
    const button = screen.getByRole("button", { name: "Show metadata" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(button);
    expect(store.get(atom_frontmatterCollapsedByDefault)).toBe(false);
  });

  it("hides metadata app-wide when shown", () => {
    const store = setup(true, false);
    const button = screen.getByRole("button", { name: "Hide metadata" });
    expect(button).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(button);
    expect(store.get(atom_frontmatterCollapsedByDefault)).toBe(true);
  });
});
