import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Documentation from "./page";
import { GROUPS } from "./content";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }), usePathname: () => "/documentation" }));

describe("Documentation page", () => {
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

  it("finds the free tools article from a tool's name", () => {
    render(<Documentation />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search documentation" }), { target: { value: "tokenizer" } });

    expect(screen.getByRole("heading", { level: 3, name: "Free tools" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mermaid in Markdown" }).getAttribute("href")).toBe("/tools/mermaid-in-markdown");
  });

  it("says so when nothing matches", () => {
    render(<Documentation />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search documentation" }), { target: { value: "zzzz-no-match" } });

    expect(screen.getByText("No results for “zzzz-no-match”.")).toBeTruthy();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });
});
