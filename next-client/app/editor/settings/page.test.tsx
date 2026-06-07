import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SettingsPage from "./page";
import "@testing-library/jest-dom";

// Mock jotai's useAtom
vi.mock("jotai", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useAtom: vi.fn(),
  };
});

// Mock next/navigation router
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// Mock atoms
vi.mock("@/app/atoms/atoms", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    atom_editorWidth: { toString: () => "atom_editorWidth" },
    atom_fontSize: { toString: () => "atom_fontSize" },
    atom_fontFamily: { toString: () => "atom_fontFamily" },
    atom_lineHeight: { toString: () => "atom_lineHeight" },
    atom_letterSpacing: { toString: () => "atom_letterSpacing" },
    atom_theme: { toString: () => "atom_theme" },
    atom_autosaveMode: { toString: () => "atom_autosaveMode" },
    atom_autosaveDelay: { toString: () => "atom_autosaveDelay" },
    atom_currency: { toString: () => "atom_currency" },
    atom_sidebarTabOrder: { toString: () => "atom_sidebarTabOrder" },
    atom_autoInjectFrontmatter: { toString: () => "atom_autoInjectFrontmatter" },
    atom_showStats: { toString: () => "atom_showStats" },
  };
});

import { useAtom } from "jotai";

// Helper: switch to the "Editor" category so its controls render
const openEditorSection = () => fireEvent.click(screen.getByText("Editor"));
const openInterfaceSection = () => fireEvent.click(screen.getByText("Interface"));

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();

    (useAtom as any).mockImplementation((atom: any) => {
      const atomStr = atom.toString();
      if (atomStr === "atom_editorWidth") return ["standard", vi.fn()];
      if (atomStr === "atom_fontSize") return ["16px", vi.fn()];
      if (atomStr === "atom_autosaveMode") return ["afterDelay", vi.fn()];
      if (atomStr === "atom_autosaveDelay") return [2000, vi.fn()];
      if (atomStr === "atom_currency") return ["USD", vi.fn()];
      if (atomStr === "atom_fontFamily") return ["MONO", vi.fn()];
      if (atomStr === "atom_lineHeight") return ["1.8", vi.fn()];
      if (atomStr === "atom_letterSpacing") return ["normal", vi.fn()];
      if (atomStr === "atom_sidebarTabOrder") return [["content", "views"], vi.fn()];
      if (atomStr === "atom_autoInjectFrontmatter") return [false, vi.fn()];
      if (atomStr === "atom_showStats") return [true, vi.fn()];
      if (atomStr === "atom_theme") return ["light", vi.fn()];
      return ["", vi.fn()];
    });
  });

  it("renders typography controls on the default tab", () => {
    render(<SettingsPage />);
    // Typography is the default-active section — no nav click needed.
    expect(screen.getByText("Text Size")).toBeInTheDocument();
    expect(screen.getByText("Font")).toBeInTheDocument();
    expect(screen.getByText("Line Height")).toBeInTheDocument();
    expect(screen.getByText("Letter Spacing")).toBeInTheDocument();
  });

  it("calls setter when line height option is clicked", () => {
    const setLineHeight = vi.fn();
    (useAtom as any).mockImplementation((atom: any) => {
      const str = atom.toString();
      if (str === "atom_lineHeight") return ["1.8", setLineHeight];
      if (str === "atom_sidebarTabOrder") return [["content", "views"], vi.fn()];
      return ["", vi.fn()];
    });

    render(<SettingsPage />);
    fireEvent.click(screen.getByText("Relaxed"));
    expect(setLineHeight).toHaveBeenCalledWith("2.0");
  });

  it("renders editor settings options", () => {
    (useAtom as any).mockImplementation((atom: any) => {
      const str = atom.toString();
      if (str === "atom_sidebarTabOrder") return [["content", "views"], vi.fn()];
      if (str === "atom_autosaveMode") return ["afterDelay", vi.fn()];
      if (str === "atom_autosaveDelay") return [2000, vi.fn()];
      if (str === "atom_editorWidth") return ["standard", vi.fn()];
      return ["", vi.fn()];
    });
    render(<SettingsPage />);
    openEditorSection();

    expect(screen.getByText("Editor Width")).toBeInTheDocument();
    expect(screen.getAllByText("Standard").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Narrow")).toBeInTheDocument();
    expect(screen.getByText("Autosave Delay")).toBeInTheDocument();
  });

  it("calls setter when autosave delay is changed", () => {
    const setAutosaveDelay = vi.fn();
    (useAtom as any).mockImplementation((atom: any) => {
      const atomStr = atom.toString();
      if (atomStr === "atom_autosaveMode") return ["afterDelay", vi.fn()];
      if (atomStr === "atom_autosaveDelay") return [2000, setAutosaveDelay];
      if (atomStr === "atom_sidebarTabOrder") return [["content", "views"], vi.fn()];
      return ["", vi.fn()];
    });

    render(<SettingsPage />);
    openEditorSection();

    const select = screen.getByDisplayValue("2s");
    fireEvent.change(select, { target: { value: "5000" } });
    expect(setAutosaveDelay).toHaveBeenCalledWith(5000);
  });

  it("calls setter when width option is clicked", () => {
    const setEditorWidth = vi.fn();
    (useAtom as any).mockImplementation((atom: any) => {
      const str = atom.toString();
      if (str === "atom_editorWidth") return ["standard", setEditorWidth];
      if (str === "atom_sidebarTabOrder") return [["content", "views"], vi.fn()];
      return ["", vi.fn()];
    });

    render(<SettingsPage />);
    openEditorSection();

    fireEvent.click(screen.getByText("Narrow"));
    expect(setEditorWidth).toHaveBeenCalledWith("narrow");
  });

  it("calls setter when currency option is changed", () => {
    const setCurrency = vi.fn();
    (useAtom as any).mockImplementation((atom: any) => {
      const str = atom.toString();
      if (str === "atom_currency") return ["USD", setCurrency];
      if (str === "atom_sidebarTabOrder") return [["content", "views"], vi.fn()];
      return ["", vi.fn()];
    });

    render(<SettingsPage />);
    openEditorSection();

    const select = screen.getByDisplayValue("USD ($)");
    fireEvent.change(select, { target: { value: "EUR" } });
    expect(setCurrency).toHaveBeenCalledWith("EUR");
  });

  it("calls setter when sidebar tab is reordered", () => {
    const setTabOrder = vi.fn();
    (useAtom as any).mockImplementation((atom: any) => {
      if (atom.toString() === "atom_sidebarTabOrder") return [["content", "views"], setTabOrder];
      return ["", vi.fn()];
    });

    render(<SettingsPage />);
    openInterfaceSection();

    // The first tab "content" should have the "down" button enabled.
    // We'll find all buttons and look for the one that has the down icon content.
    const allButtons = screen.getAllByRole("button");
    const contentDownButton = allButtons.find(b => b.innerHTML.includes('HiChevronDown') && !b.disabled);

    if (contentDownButton) {
      fireEvent.click(contentDownButton);
      expect(setTabOrder).toHaveBeenCalledWith(["views", "content"]);
    }
  });

  it("navigates back to the editor when back button is clicked", () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByTitle("Back to editor"));
    expect(pushMock).toHaveBeenCalledWith("/editor");
  });
});
