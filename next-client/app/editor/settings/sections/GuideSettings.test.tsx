import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Provider, createStore } from "jotai";
import { atom_keyboardShortcutsOpen } from "@/app/atoms/ui-atoms";
import { version } from "@/package.json";
import GuideSettings from "./GuideSettings";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function renderGuide() {
  const store = createStore();
  render(
    <Provider store={store}>
      <GuideSettings />
    </Provider>
  );
  return store;
}

describe("GuideSettings", () => {
  beforeEach(() => pushMock.mockReset());
  afterEach(cleanup);

  it("has no welcome tour to restart", () => {
    renderGuide();
    expect(screen.queryByRole("button", { name: "Start Tour" })).not.toBeInTheDocument();
  });

  it("opens the keyboard shortcuts overlay", () => {
    const store = renderGuide();
    fireEvent.click(screen.getByRole("button", { name: "Show Shortcuts" }));
    expect(store.get(atom_keyboardShortcutsOpen)).toBe(true);
  });

  it("opens the documentation", () => {
    renderGuide();
    fireEvent.click(screen.getByRole("button", { name: "Open Docs" }));
    expect(pushMock).toHaveBeenCalledWith("/documentation");
  });

  it("shows the app version and about links", () => {
    renderGuide();
    expect(screen.getByText(version)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Privacy" }).getAttribute("href")).toBe("/privacy-policy");
  });
});
