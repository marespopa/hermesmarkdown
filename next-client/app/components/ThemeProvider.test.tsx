import { render, waitFor } from "@testing-library/react";
import { Provider as JotaiProvider, createStore } from "jotai";
import { afterEach, describe, expect, it, vi } from "vitest";
import ThemeProvider from "./ThemeProvider";
import { useResolvedTheme } from "@/app/hooks/use-resolved-theme";

function ThemeProbe() {
  const theme = useResolvedTheme();
  return <div>{theme}</div>;
}

describe("ThemeProvider", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    document.documentElement.className = "";
    window.localStorage.clear();
    window.matchMedia = originalMatchMedia;
  });

  it("preserves the pre-hydration dark root class until theme storage hydrates", () => {
    document.documentElement.classList.add("dark");
    window.localStorage.setItem("theme", JSON.stringify("dark"));
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <JotaiProvider store={createStore()}>
        <ThemeProvider>
          <ThemeProbe />
        </ThemeProvider>
      </JotaiProvider>,
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    return waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });
});
