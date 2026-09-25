import { fireEvent, render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom_theme } from "@/app/atoms/atoms";
import NavigationLinks from "./NavigationLinks";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("NavigationLinks theme control", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("cycles through system, light, dark, and back to system", () => {
    const store = createStore();
    store.set(atom_theme, "system");

    render(
      <Provider store={store}>
        <NavigationLinks />
      </Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Theme: System" }));
    expect(screen.getByRole("button", { name: "Theme: Light" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Theme: Light" }));
    expect(screen.getByRole("button", { name: "Theme: Dark" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Theme: Dark" }));
    expect(screen.getByRole("button", { name: "Theme: System" })).toBeInTheDocument();
  });
});
