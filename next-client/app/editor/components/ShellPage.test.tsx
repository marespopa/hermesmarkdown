import React from "react";
import { render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { describe, expect, it, vi } from "vitest";
import ShellPage from "./ShellPage";

vi.mock("next/navigation", () => ({
  usePathname: () => "/editor/tasks",
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/app/hooks/use-mobile-chrome", () => ({ default: () => false }));
vi.mock("./SearchPill", () => ({
  default: function SearchPillMock() {
    return <button type="button" aria-label="Search files and command palette modes" />;
  },
}));

describe("ShellPage", () => {
  it("places Documentation immediately before search", () => {
    render(
      <Provider store={createStore()}>
        <ShellPage title="Tasks"><main>Tasks</main></ShellPage>
      </Provider>,
    );

    const documentation = screen.getByRole("link", { name: "Documentation" });
    const search = screen.getByRole("button", { name: "Search files and command palette modes" });
    expect(documentation).toHaveAttribute("href", "/documentation");
    expect(documentation.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
