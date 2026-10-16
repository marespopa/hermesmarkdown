import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ThemePicker from "./ThemePicker";
import { DARK_THEMES, LIGHT_THEMES, resolveDarkTheme, resolveLightTheme } from "@/app/theme-palettes";

describe("ThemePicker", () => {
  it("shows every palette and marks the selected one", () => {
    render(<ThemePicker themes={LIGHT_THEMES} value="sepia" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Paper theme" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Sepia theme" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Porcelain theme" })).toBeInTheDocument();
  });

  it("reports the clicked palette", () => {
    const onChange = vi.fn();
    render(<ThemePicker themes={DARK_THEMES} value="ink" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Graphite theme" }));
    expect(onChange).toHaveBeenCalledWith("graphite");
  });
});

describe("theme palettes", () => {
  it("offers at least three palettes per mode", () => {
    expect(LIGHT_THEMES.length).toBeGreaterThanOrEqual(3);
    expect(DARK_THEMES.length).toBeGreaterThanOrEqual(3);
  });

  it("falls back to the default palette for unknown stored values", () => {
    expect(resolveLightTheme("porcelain")).toBe("porcelain");
    expect(resolveLightTheme("midnight")).toBe("paper");
    expect(resolveDarkTheme(undefined)).toBe("ink");
  });
});
