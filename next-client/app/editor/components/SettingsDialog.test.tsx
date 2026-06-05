import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SettingsDialog from "./SettingsDialog";
import "@testing-library/jest-dom";

// Mock jotai's useAtom and createStore
vi.mock("jotai", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useAtom: vi.fn(),
  };
});

// Mock atoms
vi.mock("@/app/atoms/atoms", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    atom_editorWidth: { toString: () => "atom_editorWidth" },
    atom_fontSize: { toString: () => "atom_fontSize" },
    atom_theme: { toString: () => "atom_theme" },
    atom_autosaveMode: { toString: () => "atom_autosaveMode" },
    atom_autosaveDelay: { toString: () => "atom_autosaveDelay" },
    atom_currency: { toString: () => "atom_currency" },
  };
});

import { useAtom } from "jotai";

describe("SettingsDialog Component", () => {
  const mockOnClose = vi.fn();

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
      return ["", vi.fn()];
    });
  });

  it("renders settings options", () => {
    render(<SettingsDialog isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText("Editor Width")).toBeInTheDocument();
    // Use getAllByText as "Standard" now appears twice (Text Size and Editor Width)
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
      return ["", vi.fn()];
    });

    render(<SettingsDialog isOpen={true} onClose={mockOnClose} />);
    
    const select = screen.getByDisplayValue("2s");
    fireEvent.change(select, { target: { value: "5000" } });
    expect(setAutosaveDelay).toHaveBeenCalledWith(5000);
  });

  it("calls setter when width option is clicked", () => {
    const setEditorWidth = vi.fn();
    (useAtom as any).mockImplementation((atom: any) => {
      if (atom.toString() === "atom_editorWidth") return ["standard", setEditorWidth];
      return ["", vi.fn()];
    });

    render(<SettingsDialog isOpen={true} onClose={mockOnClose} />);
    
    fireEvent.click(screen.getByText("Narrow"));
    expect(setEditorWidth).toHaveBeenCalledWith("narrow");
  });

  it("calls setter when currency option is changed", () => {
    const setCurrency = vi.fn();
    (useAtom as any).mockImplementation((atom: any) => {
      if (atom.toString() === "atom_currency") return ["USD", setCurrency];
      return ["", vi.fn()];
    });

    render(<SettingsDialog isOpen={true} onClose={mockOnClose} />);
    
    const select = screen.getByDisplayValue("USD ($)");
    fireEvent.change(select, { target: { value: "EUR" } });
    expect(setCurrency).toHaveBeenCalledWith("EUR");
  });

  it("calls onClose when close button is clicked", () => {
    render(<SettingsDialog isOpen={true} onClose={mockOnClose} />);

    // The close button is the aria-label="Close modal" one in DialogModal
    const closeButton = screen.getByLabelText("Close modal");
    
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
