import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ThemePicker from "./ThemePicker";
import { DARK_THEMES, LIGHT_THEMES, resolveDarkTheme, resolveLightTheme } from "@/app/theme-palettes";

describe("ThemePicker", () => {
  it("shows every palette and marks the selected one", () => {
    render(<ThemePicker themes={LIGHT_THEMES} value="paper" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Solarized theme" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Paper theme" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Plain theme" })).toBeInTheDocument();
  });

  it("reports the clicked palette", () => {
    const onChange = vi.fn();
    render(<ThemePicker themes={DARK_THEMES} value="ink" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Graphite theme" }));
    expect(onChange).toHaveBeenCalledWith("graphite");
  });
});

describe("theme palettes", () => {
  it("offers the palettes in pairs, plus Sepia and Nord", () => {
    expect(LIGHT_THEMES.map((t) => t.value)).toEqual(["paper", "sepia", "solarized", "plain"]);
    expect(DARK_THEMES.map((t) => t.value)).toEqual(["ink", "nord", "solarized", "graphite"]);
  });

  it("moves palettes from earlier versions to their closest current one", () => {
    expect(resolveLightTheme("sage")).toBe("paper");
    expect(resolveLightTheme("porcelain")).toBe("plain");
    expect(resolveDarkTheme("midnight")).toBe("nord");
    expect(resolveDarkTheme("dusk")).toBe("ink");
  });

  it("falls back to the default palette for unknown stored values", () => {
    expect(resolveLightTheme("plain")).toBe("plain");
    expect(resolveLightTheme("sepia")).toBe("sepia");
    expect(resolveLightTheme("nord")).toBe("paper");
    expect(resolveDarkTheme(undefined)).toBe("ink");
  });
});
