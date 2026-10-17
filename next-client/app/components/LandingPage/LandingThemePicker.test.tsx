import { fireEvent, render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { describe, expect, it } from "vitest";
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
  it("shows the light palettes in light mode, Paper picked by default", () => {
    renderPicker("light");

    expect(screen.getByRole("button", { name: "Paper theme" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Nord theme" })).not.toBeInTheDocument();
  });

  it("picks a palette and a mode", () => {
    const store = renderPicker("light");

    fireEvent.click(screen.getByRole("button", { name: "Plain theme" }));
    expect(store.get(atom_lightTheme)).toBe("plain");

    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    expect(store.get(atom_theme)).toBe("dark");
    fireEvent.click(screen.getByRole("button", { name: "Graphite theme" }));
    expect(store.get(atom_darkTheme)).toBe("graphite");
  });

  it("shows both palettes under System", () => {
    renderPicker("system");

    expect(screen.getByRole("heading", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dark" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nord theme" })).toHaveAttribute("aria-pressed", "true");
  });
});
