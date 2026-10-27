import { cleanup, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, describe, expect, it, vi } from "vitest";
import EditorSkeleton from "./EditorSkeleton";

const pathname = vi.hoisted(() => ({ current: "/editor" }));
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ push: vi.fn() }),
}));

function renderSkeleton() {
  return render(
    <Provider store={createStore()}>
      <EditorSkeleton />
    </Provider>,
  );
}

afterEach(() => {
  cleanup();
  pathname.current = "/editor";
});

describe("EditorSkeleton", () => {
  it("announces that the vault is loading", () => {
    renderSkeleton();
    expect(screen.getByRole("status", { name: "Loading vault" })).toBeInTheDocument();
    expect(screen.getByText("Loading your vault…")).toBeInTheDocument();
  });

  it("outlines the editor: there is no home screen to land on", () => {
    const { container } = renderSkeleton();
    expect(container.querySelector(".editor-sheet")).not.toBeNull();
  });

  it("outlines the Templates page on a refresh there, with the built-in examples by name", () => {
    pathname.current = "/editor/templates";
    renderSkeleton();
    expect(screen.getByRole("status", { name: "Loading vault" })).toBeInTheDocument();
    expect(screen.getByText("Examples")).toBeInTheDocument();
    expect(screen.getByText("Research folder")).toBeInTheDocument();
  });

  it("outlines the Tasks page on a refresh there, with its view tabs", () => {
    pathname.current = "/editor/tasks";
    renderSkeleton();
    expect(screen.getAllByText("Tasks").length).toBeGreaterThan(0);
    expect(screen.queryByText("Research folder")).not.toBeInTheDocument();
  });

  it("outlines All Files, Settings and Trash on a refresh there", () => {
    pathname.current = "/editor/files";
    renderSkeleton();
    expect(screen.getByRole("heading", { name: "All Files", hidden: true })).toBeInTheDocument();
    cleanup();
    pathname.current = "/editor/settings";
    renderSkeleton();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    cleanup();
    pathname.current = "/editor/trash";
    renderSkeleton();
    expect(screen.getByRole("heading", { name: "Trash", hidden: true })).toBeInTheDocument();
  });
});
