import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { Provider, createStore } from "jotai";
import { atom_mobileDrawerOpen } from "@/app/atoms/mobile-drawer-atoms";
import MobileDrawer from "./MobileDrawer";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/editor",
}));
vi.mock("./FilesPane", () => ({ default: () => <div>files tree</div> }));

function setup() {
  const store = createStore();
  store.set(atom_mobileDrawerOpen, true);
  render(<Provider store={store}><MobileDrawer /></Provider>);
  return store;
}

describe("MobileDrawer", () => {
  beforeEach(() => push.mockClear());

  it("shows only the Files pane, with no tabs", () => {
    setup();
    expect(screen.getByText("files tree")).toBeVisible();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("closes from the × and goes to Settings from the footer", () => {
    const store = setup();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(push).toHaveBeenCalledWith("/editor/settings");
    expect(store.get(atom_mobileDrawerOpen)).toBe(false);
  });
});
