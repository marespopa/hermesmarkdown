import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHomeFeedUrlSync } from "./use-home-feed-url";

function setUrl(path: string) {
  window.history.replaceState(null, "", path);
}

function search() {
  return window.location.search;
}

describe("useHomeFeedUrlSync", () => {
  afterEach(() => setUrl("/"));

  it("opens the feed from ?view=home on mount", () => {
    setUrl("/editor?view=home");
    const setIsOpen = vi.fn();
    renderHook(() => useHomeFeedUrlSync(false, false, setIsOpen));
    expect(setIsOpen).toHaveBeenCalledWith(true);
  });

  it("writes ?view=home when the feed opens and removes it when it closes", () => {
    setUrl("/editor?other=1#h");
    const { rerender } = renderHook(({ open }) => useHomeFeedUrlSync(open, true, vi.fn()), {
      initialProps: { open: false },
    });
    expect(search()).toBe("?other=1");

    rerender({ open: true });
    expect(search()).toBe("?other=1&view=home");
    expect(window.location.hash).toBe("#h");

    rerender({ open: false });
    expect(search()).toBe("?other=1");
  });

  it("leaves the URL alone until a vault is open", () => {
    setUrl("/editor?view=home");
    const setIsOpen = vi.fn();
    const { rerender } = renderHook(({ open }) => useHomeFeedUrlSync(open, false, setIsOpen), {
      initialProps: { open: false },
    });
    rerender({ open: false });
    expect(search()).toBe("?view=home");
  });

  it("adds the param when returning to the editor with the feed already open", () => {
    setUrl("/editor");
    renderHook(() => useHomeFeedUrlSync(true, true, vi.fn()));
    expect(search()).toBe("?view=home");
  });
});
