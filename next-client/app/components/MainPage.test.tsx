import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MainPage from "./MainPage";

let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("./CommandPalette/CommandPalette", () => ({
  default: function CommandPaletteMock() {
    return <div data-testid="command-palette" />;
  },
}));
vi.mock("./KeyboardShortcutsOverlay/KeyboardShortcutsOverlay", () => ({
  default: function KeyboardShortcutsOverlayMock() {
    return <div data-testid="shortcuts-overlay" />;
  },
}));
vi.mock("./CommandPalette/AppCommands", () => ({ default: () => null }));
vi.mock("../editor/settings/components/SettingsCommands", () => ({ default: () => null }));
vi.mock("./Header", () => ({ default: () => null }));
vi.mock("./Footer/Footer.component", () => ({ default: () => null }));
vi.mock("./DialogModal/GlobalDialog", () => ({ default: () => null }));
vi.mock("./TemplateDialog/TemplateDialogHost", () => ({ default: () => null }));
vi.mock("../hooks/use-tap-refocus", () => ({ default: () => {} }));
vi.mock("next/script", () => ({ default: () => null }));

describe("MainPage", () => {
  beforeEach(() => {
    pathname = "/";
  });

  it("leaves the palette out of marketing pages until it is first opened", async () => {
    render(<MainPage><p>Landing</p></MainPage>);
    expect(screen.queryByTestId("command-palette")).toBeNull();

    await act(async () => {
      fireEvent.keyDown(document, { key: "k", metaKey: true });
    });
    expect(await screen.findByTestId("command-palette")).toBeTruthy();
  });

  it("mounts the palette and the shortcuts overlay at once in the editor", async () => {
    pathname = "/editor";
    render(<MainPage><p>Editor</p></MainPage>);
    expect(await screen.findByTestId("command-palette")).toBeTruthy();
    expect(await screen.findByTestId("shortcuts-overlay")).toBeTruthy();
  });
});
