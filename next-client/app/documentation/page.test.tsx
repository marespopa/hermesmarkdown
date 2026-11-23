import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Documentation from "./page";
import { GROUPS } from "./content";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace }), usePathname: () => "/documentation" }));

describe("Documentation page", () => {
  afterEach(() => {
    replace.mockClear();
    window.location.hash = "";
  });

  it("opens with the search hero and a card per section", () => {
    render(<Documentation />);

    expect(screen.getByRole("heading", { level: 1, name: "How can we help?" })).toBeTruthy();
    const topics = within(screen.getByRole("navigation", { name: "Topics" }));
    for (const group of GROUPS) {
      expect(topics.getByText(group.label).closest("a")?.getAttribute("href")).toBe(`#${group.id}`);
    }
  });

  it("filters articles by search, hiding the topic cards", () => {
    render(<Documentation />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search documentation" }), { target: { value: "vim" } });

    expect(screen.queryByRole("navigation", { name: "Topics" })).toBeNull();
    expect(screen.getByRole("heading", { level: 3, name: "Vim mode" })).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 3, name: "Installation" })).toBeNull();
    expect(screen.getByText(/articles? found/)).toBeTruthy();
  });

  it("says so when nothing matches", () => {
    render(<Documentation />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search documentation" }), { target: { value: "zzzz-no-match" } });

    expect(screen.getByText("No results for “zzzz-no-match”.")).toBeTruthy();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("links each article to its own URL", () => {
    render(<Documentation />);

    const article = GROUPS[0].items[0];
    const link = screen.getByRole("heading", { level: 3, name: article.title }).closest("a");
    expect(link?.getAttribute("href")).toBe(`/documentation/${article.id}`);
  });

  it("sends an old #article link to the article's URL", () => {
    const article = GROUPS[0].items[0];
    window.location.hash = `#${article.id}`;
    render(<Documentation />);

    expect(replace).toHaveBeenCalledWith(`/documentation/${article.id}`);
  });

  it("leaves a #section link on the hub", () => {
    window.location.hash = `#${GROUPS[0].id}`;
    render(<Documentation />);

    expect(replace).not.toHaveBeenCalled();
  });
});
