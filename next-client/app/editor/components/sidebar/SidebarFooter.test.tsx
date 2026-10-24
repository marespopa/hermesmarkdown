import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_keyboardShortcutsOpen } from "@/app/atoms/ui-atoms";
import SidebarFooter from "./SidebarFooter";

const navigation = vi.hoisted(() => ({ push: vi.fn(), pathname: "/editor" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
  usePathname: () => navigation.pathname,
}));

const renderFooter = () => {
  const store = createStore();
  render(
    <Provider store={store}>
      <SidebarFooter />
    </Provider>,
  );
  return store;
};

describe("SidebarFooter", () => {
  beforeEach(() => {
    navigation.push.mockClear();
    navigation.pathname = "/editor";
  });
  afterEach(cleanup);

  it("opens Settings, marked current while on a Settings page", () => {
    renderFooter();
    const settings = screen.getByRole("button", { name: "Settings" });
    expect(settings).not.toHaveAttribute("aria-current");
    fireEvent.click(settings);
    expect(navigation.push).toHaveBeenCalledWith("/editor/settings");

    cleanup();
    navigation.pathname = "/editor/settings";
    renderFooter();
    expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute("aria-current", "page");
  });

  it("opens the Documentation in a new tab from the Help menu", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    renderFooter();
    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    fireEvent.click(within(screen.getByRole("menu", { name: "Help" })).getByRole("menuitem", { name: "Documentation" }));
    expect(open).toHaveBeenCalledWith("/documentation", "_blank", "noopener");
    expect(screen.queryByRole("menu", { name: "Help" })).not.toBeInTheDocument();
    open.mockRestore();
  });

  it("shows the keyboard shortcuts from the Help menu", () => {
    const store = renderFooter();
    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Keyboard Shortcuts/ }));
    expect(store.get(atom_keyboardShortcutsOpen)).toBe(true);
  });
});
