import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_pinsState, type PinsState } from "@/app/atoms/pin-atoms";
import { updatePinsFile } from "@/app/services/vault-pins";
import TagsPage from "./page";

const push = vi.fn();
const fileSystem = vi.hoisted(() => ({ vaultHandle: { name: "Notes" } as unknown, openFile: vi.fn(async () => {}) }));

// The App Router keeps useSearchParams in step with the URL; here it's read
// from the URL on each render.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: () => fileSystem }));
const mobileChrome = vi.hoisted(() => ({ value: false }));
vi.mock("@/app/hooks/use-mobile-chrome", () => ({ default: () => mobileChrome.value }));
vi.mock("@/app/services/vault-pins", () => ({
  PinsFileInvalidError: class extends Error {},
  PinsFileNewerError: class extends Error {},
  updatePinsFile: vi.fn(async () => ({ pins: [{ kind: "tag", target: "release", icon: null }], changed: true })),
}));

const note = (path: string, tags: string[], modifiedAt: number) =>
  ({ path, name: path.split("/").pop()!, tags, links: [], frontmatter: {}, modifiedAt, wordCount: 3, tasks: [], handle: { name: path } }) as FileMetadata;

const metadata = {
  "projects/launch.md": note("projects/launch.md", ["release", "roadmap"], 2),
  "notes/changelog.md": note("notes/changelog.md", ["release"], 5),
  "inbox.md": note("inbox.md", [], 1),
};

const vault = { name: "Notes" } as unknown as FileSystemDirectoryHandle;
const pinsState: PinsState = { vault, status: "ok", pins: [] };

const Hydrate = ({ children }: { children: React.ReactNode }) => {
  useHydrateAtoms([[atom_fileMetadata, metadata]]);
  useHydrateAtoms([[atom_pinsState, pinsState]]);
  return <>{children}</>;
};

const page = () => <Provider><Hydrate><TagsPage /></Hydrate></Provider>;
const renderPage = () => render(page());

describe("TagsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mobileChrome.value = false;
    fileSystem.vaultHandle = { name: "Notes" };
    window.history.replaceState(null, "", "/editor/tags");
  });

  it("lists every tag with its count", () => {
    renderPage();
    const tags = screen.getByRole("navigation", { name: "Tags" });
    expect(within(tags).getAllByRole("button").map((button) => button.textContent)).toEqual(["#release2", "#roadmap1"]);
  });

  it("shows a tag's notes, newest first, and keeps the tag in the URL", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /release/ }));

    const list = screen.getByRole("list", { name: "Notes tagged release" });
    const rows = within(list).getAllByRole("button");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("changelog");
    expect(rows[1]).toHaveTextContent("launch");
    expect(window.location.search).toBe("?tag=release");
  });

  it("opens the tag the URL names, and a note at its editor URL", async () => {
    window.history.replaceState(null, "", "/editor/tags?tag=roadmap");
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /launch/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/editor?file=projects/launch.md"));
    expect(fileSystem.openFile).toHaveBeenCalledWith({ name: "projects/launch.md" }, "projects/launch.md");
  });

  it("follows the URL's tag after it has opened", () => {
    window.history.replaceState(null, "", "/editor/tags?tag=roadmap");
    const { rerender } = renderPage();
    expect(screen.getByRole("heading", { name: "#roadmap" })).toBeInTheDocument();

    // A pinned tag clicked in the sidebar rewrites the URL in place.
    window.history.replaceState(null, "", "/editor/tags?tag=release");
    rerender(page());
    expect(screen.getByRole("heading", { name: "#release" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Notes tagged release" })).toBeInTheDocument();
  });

  it("pins the chosen tag, then reads Pinned", async () => {
    window.history.replaceState(null, "", "/editor/tags?tag=release");
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Pin" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Pinned" })).toBeDisabled());
    expect(updatePinsFile).toHaveBeenCalledWith(vault, expect.any(Function));
  });

  it("has no Pin button on mobile, which has no sidebar", () => {
    mobileChrome.value = true;
    window.history.replaceState(null, "", "/editor/tags?tag=release");
    renderPage();
    expect(screen.getByRole("heading", { name: "#release" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pin" })).not.toBeInTheDocument();
  });

  it("asks for a vault without one", () => {
    fileSystem.vaultHandle = null;
    renderPage();
    expect(screen.getByText("Open a vault to see its tags.")).toBeInTheDocument();
  });
});
