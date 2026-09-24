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
    atom_editorFontFamily: { toString: () => "atom_editorFontFamily" },
    atom_lineHeight: { toString: () => "atom_lineHeight" },
    atom_theme: { toString: () => "atom_theme" },
    atom_autosaveMode: { toString: () => "atom_autosaveMode" },
    atom_autosaveDelay: { toString: () => "atom_autosaveDelay" },
    atom_vimMode: { toString: () => "atom_vimMode" },
    atom_showStats: { toString: () => "atom_showStats" },
  };
});

import { useAtom } from "jotai";

// Helper: switch to the "Editor" category so its controls render.
// The page has two "Editor" texts: the back-button breadcrumb and the nav item.
// We target the nav item (last match in DOM order).
const openEditorSection = () => {
  const matches = screen.getAllByText("Editor");
  fireEvent.click(matches[matches.length - 1]);
};

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();

    (useAtom as any).mockImplementation((atom: any) => {
      const atomStr = atom.toString();
      if (atomStr === "atom_editorWidth") return ["standard", vi.fn()];
      if (atomStr === "atom_autosaveMode") return ["afterDelay", vi.fn()];
      if (atomStr === "atom_autosaveDelay") return [2000, vi.fn()];
      if (atomStr === "atom_lineHeight") return ["1.8", vi.fn()];
      if (atomStr === "atom_showStats") return [true, vi.fn()];
      if (atomStr === "atom_theme") return ["light", vi.fn()];
      return ["", vi.fn()];
    });
  });

  it("renders typography controls on the default tab", () => {
    render(<SettingsPage />);
    // Typography is the default-active section — no nav click needed.
    expect(screen.getByText("Font")).toBeInTheDocument();
    expect(screen.getByText("Geist Mono")).toBeInTheDocument();
    expect(screen.getByText("Inter")).toBeInTheDocument();
    expect(screen.getByText("IBM Plex Mono")).toBeInTheDocument();
    expect(screen.getByText("Plus Jakarta Sans")).toBeInTheDocument();
    expect(screen.queryByText("Text Size")).not.toBeInTheDocument();
    expect(screen.queryByText("Line Height")).not.toBeInTheDocument();
  });

  it("calls the source font setter when a generic font is selected", () => {
    const setEditorFontFamily = vi.fn();
    (useAtom as any).mockImplementation((atom: any) => {
      if (atom.toString() === "atom_editorFontFamily") return ["ui-monospace, monospace", setEditorFontFamily];
      return ["", vi.fn()];
    });

    render(<SettingsPage />);
    fireEvent.click(screen.getByText("Inter"));
    expect(setEditorFontFamily).toHaveBeenCalledWith(
      "var(--font-inter), Inter, ui-sans-serif, sans-serif",
    );
  });

  it("renders editor settings options", () => {
    (useAtom as any).mockImplementation((atom: any) => {
      const str = atom.toString();
      if (str === "atom_autosaveMode") return ["afterDelay", vi.fn()];
      if (str === "atom_autosaveDelay") return [2000, vi.fn()];
      if (str === "atom_editorWidth") return ["standard", vi.fn()];
      return ["", vi.fn()];
    });
    render(<SettingsPage />);
    openEditorSection();

    expect(screen.getByText("Vim Mode")).toBeInTheDocument();
    expect(screen.getByText("Delay")).toBeInTheDocument();
  });

  it("calls setter when autosave delay is changed", () => {
    const setAutosaveDelay = vi.fn();
    (useAtom as any).mockImplementation((atom: any) => {
      const atomStr = atom.toString();
      if (atomStr === "atom_autosaveMode") return ["afterDelay", vi.fn()];
      if (atomStr === "atom_autosaveDelay") return [2000, setAutosaveDelay];
      return ["", vi.fn()];
    });

    render(<SettingsPage />);
    openEditorSection();

    const select = screen.getByDisplayValue("2s");
    fireEvent.change(select, { target: { value: "5000" } });
    expect(setAutosaveDelay).toHaveBeenCalledWith(5000);
  });

  it("navigates back to the editor when back button is clicked", () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByTitle("Back to editor"));
    expect(pushMock).toHaveBeenCalledWith("/editor");
  });
});
