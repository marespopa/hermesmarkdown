import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ThemePicker from "./ThemePicker";
import { DARK_THEMES, LIGHT_THEMES, resolveDarkTheme, resolveLightTheme } from "@/app/theme-palettes";

describe("ThemePicker", () => {
  it("shows every palette and marks the selected one", () => {
    render(<ThemePicker themes={LIGHT_THEMES} value="paper" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Sepia theme" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Paper theme" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Quartz theme" })).toBeInTheDocument();
  });

  it("reports the clicked palette", () => {
    const onChange = vi.fn();
    render(<ThemePicker themes={DARK_THEMES} value="ink" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Nord theme" }));
    expect(onChange).toHaveBeenCalledWith("nord");
  });

  it("offers the blue-caret neutral pair in each mode", () => {
    const onChange = vi.fn();
    const { unmount } = render(<ThemePicker themes={LIGHT_THEMES} value="paper" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Quartz theme" }));
    expect(onChange).toHaveBeenCalledWith("quartz");
    unmount();

    render(<ThemePicker themes={DARK_THEMES} value="ink" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Onyx theme" }));
    expect(onChange).toHaveBeenCalledWith("onyx");
  });
});

describe("theme palettes", () => {
  it("offers three palettes a mode", () => {
    expect(LIGHT_THEMES.map((t) => t.value)).toEqual(["paper", "sepia", "quartz"]);
    expect(DARK_THEMES.map((t) => t.value)).toEqual(["ink", "nord", "onyx"]);
  });

  it("moves palettes from earlier versions to their closest current one", () => {
    expect(resolveLightTheme("sage")).toBe("paper");
    expect(resolveLightTheme("porcelain")).toBe("quartz");
    expect(resolveLightTheme("plain")).toBe("quartz");
    expect(resolveLightTheme("solarized")).toBe("sepia");
    expect(resolveDarkTheme("graphite")).toBe("onyx");
    expect(resolveDarkTheme("solarized")).toBe("nord");
    expect(resolveDarkTheme("midnight")).toBe("nord");
    expect(resolveDarkTheme("dusk")).toBe("ink");
  });

  it("falls back to the default palette for unknown stored values", () => {
    expect(resolveLightTheme("quartz")).toBe("quartz");
    expect(resolveLightTheme("sepia")).toBe("sepia");
    expect(resolveLightTheme("nord")).toBe("paper");
    expect(resolveDarkTheme(undefined)).toBe("ink");
  });
});
