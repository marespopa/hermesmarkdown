import { fireEvent, render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { beforeEach, describe, expect, it } from "vitest";
import { atom_darkTheme, atom_lightTheme, atom_theme } from "@/app/atoms/ui-atoms";
import LandingThemePicker from "./LandingThemePicker";

function renderPicker(theme: "light" | "dark" | "system" = "light") {
  const store = createStore();
  store.set(atom_theme, theme);
  render(
    <Provider store={store}>
      <LandingThemePicker />
    </Provider>,
  );
  return store;
}

describe("LandingThemePicker", () => {
  // The picks persist to localStorage, which the next test would read.
  beforeEach(() => window.localStorage.clear());

  it("shows the light palettes in light mode, Quartz picked by default", () => {
    renderPicker("light");

    expect(screen.getByRole("button", { name: "Quartz theme" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Nord theme" })).not.toBeInTheDocument();
  });

  it("picks a palette and a mode", () => {
    const store = renderPicker("light");

    fireEvent.click(screen.getByRole("button", { name: "Sepia theme" }));
    expect(store.get(atom_lightTheme)).toBe("sepia");

    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    expect(store.get(atom_theme)).toBe("dark");
    fireEvent.click(screen.getByRole("button", { name: "Nord theme" }));
    expect(store.get(atom_darkTheme)).toBe("nord");
  });

  it("shows both palettes under System", () => {
    renderPicker("system");

    expect(screen.getByRole("heading", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dark" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Onyx theme" })).toHaveAttribute("aria-pressed", "true");
  });
});
