import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider, useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { atom_activePaneId, atom_openFiles, atom_workspaceLayout } from "@/app/atoms/atoms";
import { atom_homeFeedOpen, atom_homeFeedTopRequest, atom_sidebarOpen } from "@/app/atoms/ui-atoms";
import { atom_vaultDescriptor, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import WorkspaceSidebar from "./WorkspaceSidebar";

const fileSystem = vi.hoisted(() => ({
  vaultHandle: null as unknown,
  createNewFile: vi.fn(),
  createFolder: vi.fn(),
}));

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
    createNewFile: fileSystem.createNewFile,
    createFolder: fileSystem.createFolder,
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
const TopRequest = () => <output data-testid="top-request">{useAtomValue(atom_homeFeedTopRequest)}</output>;

const left = { id: "left", type: "editor" as const, openFilePaths: ["a.md"], activeFilePath: "a.md", isPinned: false };
const right = { id: "right", type: "editor" as const, openFilePaths: ["b.md"], activeFilePath: "b.md", isPinned: false };

const renderSidebar = (open = true, homeFeedOpen = true, descriptor: unknown = null) =>
  render(
    <Provider>
      <HydrateAtoms initialValues={[
        [atom_sidebarOpen, open],
        [atom_activePaneId, "left"],
        [atom_homeFeedOpen, homeFeedOpen],
        [atom_vaultHandle, fileSystem.vaultHandle],
        [atom_vaultDescriptor, descriptor],
        [atom_openFiles, {
          "a.md": { fileName: "a.md", content: "A", lastSavedContent: "A" },
          "b.md": { fileName: "b.md", content: "B changed", lastSavedContent: "B" },
        }],
        [atom_workspaceLayout, { rootContainer: { id: "root", direction: "horizontal", sizes: [50, 50], children: [left, right] } }],
      ]}>
        <WorkspaceSidebar />
        <ActivePane />
        <HomeFeed />
        <TopRequest />
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

  it("opens the home feed from Home, with or without a vault", () => {
    renderSidebar(true, false);
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(screen.getByTestId("home-feed")).toHaveTextContent("true");
    cleanup();

    fileSystem.vaultHandle = { name: "vault" };
    renderSidebar(true, false);
    fireEvent.click(screen.getByRole("button", { name: "Home" }));

    expect(screen.getByTestId("home-feed")).toHaveTextContent("true");
    expect(screen.getByTestId("top-request")).toHaveTextContent("0");
  });

  it("asks the open feed to scroll to the top when Home is pressed again", () => {
    fileSystem.vaultHandle = { name: "vault" };
    renderSidebar(true, true);
    fireEvent.click(screen.getByRole("button", { name: "Home" }));

    expect(screen.getByTestId("home-feed")).toHaveTextContent("true");
    expect(screen.getByTestId("top-request")).toHaveTextContent("1");
  });

  it("shows the file tree only with a vault", () => {
    renderSidebar();
    expect(screen.queryByTestId("file-tree")).not.toBeInTheDocument();
    cleanup();

    fileSystem.vaultHandle = { name: "vault" };
    renderSidebar();
    expect(screen.getByTestId("file-tree")).toBeInTheDocument();
  });

  it("creates a file or folder at the vault's root from the Files ⋯ menu", () => {
    const vault = { name: "Notes" };
    fileSystem.vaultHandle = vault;
    renderSidebar(true, false);
    fireEvent.click(screen.getByRole("button", { name: "Files options" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "New Note" }));
    expect(fileSystem.createNewFile).toHaveBeenCalledWith(vault);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Files options" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "New Folder" }));
    expect(fileSystem.createFolder).toHaveBeenCalledWith(vault);
  });

  it("closes the Files menu on Escape", () => {
    fileSystem.vaultHandle = { name: "Notes" };
    renderSidebar(true, false);
    fireEvent.click(screen.getByRole("button", { name: "Files options" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("has no Files menu without a vault, and none on Open Notes", () => {
    renderSidebar();
    expect(screen.queryByRole("button", { name: /options$/ })).not.toBeInTheDocument();
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

  it("titles a browser vault by its name, not its storage folder", () => {
    fileSystem.vaultHandle = { name: "browser-3f2a" };
    renderSidebar(true, true, { version: 1, kind: "browser", id: "3f2a", displayName: "Journal", createdAt: 1 });
    expect(screen.getByRole("heading", { name: "Journal" })).toBeInTheDocument();
  });

  it("is inert while hidden", () => {
    renderSidebar(false);
    expect(screen.getByRole("navigation", { hidden: true }).closest("[inert]")).not.toBeNull();
  });
});
