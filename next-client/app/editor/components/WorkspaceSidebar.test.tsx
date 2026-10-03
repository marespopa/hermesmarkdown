import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider, useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { atom_activePaneId, atom_openFiles, atom_workspaceLayout } from "@/app/atoms/atoms";
import { atom_homeFeedOpen, atom_sidebarOpen } from "@/app/atoms/ui-atoms";
import WorkspaceSidebar from "./WorkspaceSidebar";

const fileSystem = vi.hoisted(() => ({ vaultHandle: null as unknown }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/editor",
}));

vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: () => ({
    vaultHandle: fileSystem.vaultHandle,
    openFile: vi.fn(),
    renameFile: vi.fn(),
    deleteFile: vi.fn(),
    duplicateFile: vi.fn(),
    moveItem: vi.fn(),
    createNewFile: vi.fn(),
    createFolder: vi.fn(),
  }),
}));

vi.mock("../hooks/useVaultFileSearch", () => ({
  useVaultFileSearch: () => ({ allFiles: [], folderPaths: [] }),
}));

vi.mock("./VaultFileTree", () => ({
  default: () => <div data-testid="file-tree" />,
}));

const HydrateAtoms = ({ initialValues, children }: { initialValues: any; children: React.ReactNode }) => {
  useHydrateAtoms(initialValues);
  return children;
};

const ActivePane = () => <output data-testid="active-pane">{useAtomValue(atom_activePaneId)}</output>;
const HomeFeed = () => <output data-testid="home-feed">{String(useAtomValue(atom_homeFeedOpen))}</output>;

const left = { id: "left", type: "editor" as const, openFilePaths: ["a.md"], activeFilePath: "a.md", isPinned: false };
const right = { id: "right", type: "editor" as const, openFilePaths: ["b.md"], activeFilePath: "b.md", isPinned: false };

const renderSidebar = (open = true, homeFeedOpen = true) =>
  render(
    <Provider>
      <HydrateAtoms initialValues={[
        [atom_sidebarOpen, open],
        [atom_activePaneId, "left"],
        [atom_homeFeedOpen, homeFeedOpen],
        [atom_openFiles, {
          "a.md": { fileName: "a.md", content: "A", lastSavedContent: "A" },
          "b.md": { fileName: "b.md", content: "B changed", lastSavedContent: "B" },
        }],
        [atom_workspaceLayout, { rootContainer: { id: "root", direction: "horizontal", sizes: [50, 50], children: [left, right] } }],
      ]}>
        <WorkspaceSidebar />
        <ActivePane />
        <HomeFeed />
      </HydrateAtoms>
    </Provider>
  );

describe("WorkspaceSidebar", () => {
  beforeEach(() => {
    cleanup();
    fileSystem.vaultHandle = null;
    localStorage.removeItem("sidebarOpen");
  });

  it("lists the open notes across every pane and marks the current one", () => {
    renderSidebar(true, false);

    expect(screen.getByRole("button", { name: "a.md" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /b\.md/ })).not.toHaveAttribute("aria-current");
    expect(screen.getByLabelText("Unsaved changes")).toBeInTheDocument();
  });

  it("opens a note in its pane and leaves the home feed", () => {
    renderSidebar();

    fireEvent.click(screen.getByRole("button", { name: /b\.md/ }));

    expect(screen.getByTestId("active-pane")).toHaveTextContent("right");
    expect(screen.getByTestId("home-feed")).toHaveTextContent("false");
  });

  it("marks Home, not a note, as current while the home feed is open", () => {
    fileSystem.vaultHandle = { name: "vault" };
    renderSidebar();

    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "a.md" })).not.toHaveAttribute("aria-current");
  });

  it("opens the home feed from Home, shown only with a vault", () => {
    renderSidebar(true, false);
    expect(screen.queryByRole("button", { name: "Home" })).not.toBeInTheDocument();
    cleanup();

    fileSystem.vaultHandle = { name: "vault" };
    renderSidebar(true, false);
    fireEvent.click(screen.getByRole("button", { name: "Home" }));

    expect(screen.getByTestId("home-feed")).toHaveTextContent("true");
  });

  it("shows the file tree only with a vault", () => {
    renderSidebar();
    expect(screen.queryByTestId("file-tree")).not.toBeInTheDocument();
    cleanup();

    fileSystem.vaultHandle = { name: "vault" };
    renderSidebar();
    expect(screen.getByTestId("file-tree")).toBeInTheDocument();
  });

  it("collapses a section from its header", () => {
    renderSidebar();
    const header = screen.getByRole("button", { name: "Open Notes" });

    fireEvent.click(header);

    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "a.md" })).not.toBeInTheDocument();
  });

  it("titles its header with the vault's name, beside a button that hides it", () => {
    fileSystem.vaultHandle = { name: "Notes" };
    renderSidebar();
    expect(screen.getByRole("heading", { name: "Notes" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide sidebar" }));
    expect(screen.getByRole("navigation", { hidden: true }).closest("[inert]")).not.toBeNull();
  });

  it("is inert while hidden", () => {
    renderSidebar(false);
    expect(screen.getByRole("navigation", { hidden: true }).closest("[inert]")).not.toBeNull();
  });
});
