import { render, waitFor } from "@testing-library/react";
import { Provider as JotaiProvider, createStore } from "jotai";
import { afterEach, describe, expect, it, vi } from "vitest";
import ThemeProvider, { syncThemeColor } from "./ThemeProvider";
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

  it("keeps the pre-painted palettes until storage hydrates, never the defaults", async () => {
    document.documentElement.dataset.lightTheme = "plain";
    document.documentElement.dataset.darkTheme = "graphite";
    window.localStorage.setItem("lightTheme", JSON.stringify("plain"));
    window.localStorage.setItem("darkTheme", JSON.stringify("graphite"));
    const seen: string[] = [];
    const observer = new MutationObserver(() => {
      seen.push(`${document.documentElement.dataset.lightTheme}/${document.documentElement.dataset.darkTheme}`);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-light-theme", "data-dark-theme"] });

    render(
      <JotaiProvider store={createStore()}>
        <ThemeProvider>
          <ThemeProbe />
        </ThemeProvider>
      </JotaiProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.lightTheme).toBe("plain");
      expect(document.documentElement.dataset.darkTheme).toBe("graphite");
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    observer.disconnect();
    expect(seen.filter((v) => v.startsWith("paper/") || v.endsWith("/ink"))).toEqual([]);
  });

  describe("syncThemeColor", () => {
    afterEach(() => {
      document.head.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
      document.documentElement.style.removeProperty("--surface");
    });

    it("paints every theme-color meta with the page's surface", () => {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = "#F1F0EB";
      document.head.appendChild(meta);
      document.documentElement.style.setProperty("--surface", "#2E3440");

      syncThemeColor();

      expect(meta.content).toBe("#2E3440");
    });

    it("adds a theme-color meta when the page has none", () => {
      document.documentElement.style.setProperty("--surface", "#FDF6E3");

      syncThemeColor();

      const metas = document.head.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
      expect(Array.from(metas, (m) => m.content)).toEqual(["#FDF6E3"]);
    });

    it("leaves the meta alone before the colors have loaded", () => {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = "#F1F0EB";
      document.head.appendChild(meta);

      syncThemeColor();

      expect(meta.content).toBe("#F1F0EB");
    });
  });
});
