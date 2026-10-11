import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Provider, createStore } from "jotai";
import { atom_keyboardShortcutsOpen } from "@/app/atoms/ui-atoms";
import KeyboardShortcutsOverlay from "./KeyboardShortcutsOverlay";

vi.mock("@/app/hooks/use-mobile-chrome", () => ({ default: () => false }));

function renderOpen() {
  const store = createStore();
  store.set(atom_keyboardShortcutsOpen, true);
  render(
    <Provider store={store}>
      <KeyboardShortcutsOverlay />
    </Provider>
  );
}

describe("KeyboardShortcutsOverlay", () => {
  afterEach(cleanup);

  // Opened outside /editor (e.g. Settings → Guide), no editor commands are registered.
  it("lists save, Explorer, and AI shortcuts without registered commands", () => {
    renderOpen();
    expect(screen.getByText("Save")).toBeTruthy();
    expect(screen.getByText("Open Explorer")).toBeTruthy();
    expect(screen.getByText("AI Chat (with an AI key)")).toBeTruthy();
  });

  it("lists Quick jot with its shortcut", () => {
    renderOpen();
    expect(screen.getByText("Quick jot to today's sheet")).toBeTruthy();
    expect(screen.getByText("Ctrl+Alt+J")).toBeTruthy();
  });

  it("lists formatting shortcuts without registered commands", () => {
    renderOpen();
    fireEvent.click(screen.getByRole("tab", { name: "Formatting" }));
    expect(screen.getByText("Bold")).toBeTruthy();
    expect(screen.getByText("Inline code")).toBeTruthy();
  });
});
