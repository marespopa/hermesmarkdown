import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { describe, expect, it } from "vitest";
import { atom_showOutline } from "@/app/atoms/ui-atoms";
import OutlineToggleButton from "./OutlineToggleButton";

describe("OutlineToggleButton", () => {
  it("shows and hides the outline, pressed while it's on", () => {
    const store = createStore();
    store.set(atom_showOutline, false);
    render(<Provider store={store}><OutlineToggleButton /></Provider>);
    const button = screen.getByRole("button", { name: "Outline" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(button);
    expect(store.get(atom_showOutline)).toBe(true);
    expect(button).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(button);
    expect(store.get(atom_showOutline)).toBe(false);
  });
});
