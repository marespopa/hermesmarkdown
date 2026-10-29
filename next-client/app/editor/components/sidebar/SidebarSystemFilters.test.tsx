import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import SidebarSystemFilters from "./SidebarSystemFilters";

const navigation = vi.hoisted(() => ({ push: vi.fn(), pathname: "/editor", search: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

const meta = (path: string, extra: Partial<FileMetadata> = {}): FileMetadata => ({
  path, name: path, tags: [], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 1, tasks: [], handle: null, ...extra,
});

function setup() {
  const store = createStore();
  store.set(atom_fileMetadata, {
    "a.md": meta("a.md", { tags: ["x"], modifiedAt: Date.now() }),
    "Archive/b.md": meta("Archive/b.md"),
  });
  render(<Provider store={store}><SidebarSystemFilters /></Provider>);
}

describe("SidebarSystemFilters", () => {
  beforeEach(() => {
    navigation.push.mockClear();
    navigation.pathname = "/editor";
    navigation.search = "";
  });
  afterEach(cleanup);

  it("lists the five filters with their counts", () => {
    setup();
    const row = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) });
    expect(row("All Files").textContent).toContain("2");
    expect(row("Untagged").textContent).toContain("1");
    expect(row("Today").textContent).toContain("1");
    expect(row("Archive").textContent).toContain("1");
    expect(row("Todo").textContent).toContain("0");
  });

  it("opens a filter on the Tags page", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /^Untagged/ }));
    expect(navigation.push).toHaveBeenCalledWith("/editor/tags?filter=untagged");
  });

  it("marks the filter the Tags page is showing", () => {
    navigation.pathname = "/editor/tags";
    navigation.search = "filter=archive";
    setup();
    expect(screen.getByRole("button", { name: /^Archive/ }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: /^Today/ }).getAttribute("aria-current")).toBeNull();
  });
});
