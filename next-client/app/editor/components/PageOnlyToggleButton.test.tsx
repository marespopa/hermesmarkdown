import { fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom";
import { atom_pageOnly } from "@/app/atoms/ui-atoms";
import PageOnlyToggleButton from "./PageOnlyToggleButton";

describe("PageOnlyToggleButton", () => {
  it("is a pressed-state button that turns No Distraction Mode on and off", () => {
    const store = createStore();
    const Wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
    render(<PageOnlyToggleButton />, { wrapper: Wrapper });
    const button = screen.getByRole("button", { name: "No distraction mode" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(store.get(atom_pageOnly)).toBe(true);
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(store.get(atom_pageOnly)).toBe(false);
  });
});
