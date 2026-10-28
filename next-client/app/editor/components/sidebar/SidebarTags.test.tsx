import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_pins } from "@/app/atoms/pin-atoms";
import { seedPins } from "@/app/atoms/pin-atoms.test-utils";
import SidebarTags from "./SidebarTags";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  pathname: "/editor",
  search: "",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

const meta = (path: string, tags: string[]): FileMetadata => ({
  path,
  name: path,
  tags,
  links: [],
  frontmatter: {},
  modifiedAt: 1,
  wordCount: 1,
  tasks: [],
  handle: null,
});

function setup(pinned: { kind: "tag"; target: string; icon: null }[] = []) {
  const store = createStore();
  seedPins(store, pinned);
  store.set(atom_fileMetadata, {
    "a.md": meta("a.md", ["work/projects/2026"]),
    "b.md": meta("b.md", ["work"]),
    "c.md": meta("c.md", ["home"]),
  });
  render(
    <Provider store={store}>
      <SidebarTags />
    </Provider>,
  );
  return store;
}

describe("SidebarTags", () => {
  beforeEach(() => {
    navigation.push.mockClear();
    navigation.pathname = "/editor";
    navigation.search = "";
  });
  afterEach(cleanup);

  it("nests tags on / with each parent's count rolled up", () => {
    setup();
    const tree = screen.getByRole("tree", { name: "Tags" });
    const workItem = within(tree).getByRole("treeitem", { name: /work/ });

    expect(workItem.textContent).toContain("2");
    expect(screen.queryByText("projects")).toBeNull();

    fireEvent.click(within(tree).getByRole("button", { name: "Expand work" }));

    const projectsItem = within(workItem).getByRole("treeitem", {
      name: /projects/,
    });
    expect(projectsItem.textContent).toContain("1");
  });

  it("opens a tag's notes on the Tags page", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /home/ }));
    expect(navigation.push).toHaveBeenCalledWith("/editor/tags?tag=home");
  });

  it("lists pinned tags first, apart from the tree", () => {
    setup([{ kind: "tag", target: "home", icon: null }]);
    const pinned = screen.getByRole("tree", { name: "Pinned tags" });
    expect(within(pinned).getByRole("button", { name: /home/ })).toBeTruthy();
    expect(
      within(screen.getByRole("tree", { name: "Tags" })).getByRole("button", {
        name: /home/,
      }),
    ).toBeTruthy();
  });

  it("pins a tag from its right-click menu", async () => {
    const store = setup();
    fireEvent.contextMenu(screen.getByRole("button", { name: /home/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Pin" }));
    await waitFor(() =>
      expect(
        store.get(atom_pins).map((pin) => `${pin.kind}:${pin.target}`),
      ).toEqual(["tag:home"]),
    );
  });

  it("says so when the vault has no tags", () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <SidebarTags />
      </Provider>,
    );
    expect(screen.getByText(/No tags yet/)).toBeTruthy();
  });
});
