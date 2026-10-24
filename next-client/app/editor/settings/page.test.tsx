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
vi.mock("@/app/services/ai", () => ({
  fetchClaudeModels: vi.fn().mockResolvedValue([]),
  fetchGeminiModels: vi.fn().mockResolvedValue([]),
  testAIConnection: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// Mock atoms
vi.mock("@/app/atoms/atoms", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    atom_editorFontFamily: { toString: () => "atom_editorFontFamily" },
    atom_lineHeight: { toString: () => "atom_lineHeight" },
    atom_theme: { toString: () => "atom_theme" },
    atom_autosaveMode: { toString: () => "atom_autosaveMode" },
    atom_vimMode: { toString: () => "atom_vimMode" },
    atom_showStats: { toString: () => "atom_showStats" },
  };
});

import { useAtom } from "jotai";
import { QUATTRO_FONT_STACK, atom_focusMode } from "@/app/atoms/ui-atoms";
import { atom_aiEnabled, atom_aiProvider, atom_availableClaudeModels, atom_claudeKey } from "@/app/atoms/atoms";

// Helper: switch to the "Editor" category so its controls render.
// Target the nav item (last match in DOM order), past any other "Editor" text.
const openEditorSection = () => {
  const matches = screen.getAllByText("Editor");
  fireEvent.click(matches[matches.length - 1]);
};

const openFilesSection = () => fireEvent.click(screen.getByText("Files"));

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    // Opening a section writes ?section= to the URL, which the next test
    // would otherwise open on.
    window.history.replaceState(null, "", "/editor/settings");

    (useAtom as any).mockImplementation((atom: any) => {
      const atomStr = atom.toString();
      if (atomStr === "atom_autosaveMode") return ["afterDelay", vi.fn()];
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
    // Offered for both the writing font and the code font.
    expect(screen.getAllByText("Geist Mono")).toHaveLength(2);
    expect(screen.getByText("Duospace")).toBeInTheDocument();
    expect(screen.getByText("Quattro")).toBeInTheDocument();
    expect(screen.queryByText("Inter")).not.toBeInTheDocument();
    expect(screen.queryByText("Source Serif 4")).not.toBeInTheDocument();
    expect(screen.queryByText("Plus Jakarta Sans")).not.toBeInTheDocument();
    expect(screen.getByText("Full Width")).toBeInTheDocument();
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
    fireEvent.click(screen.getByText("Quattro"));
    expect(setEditorFontFamily).toHaveBeenCalledWith(QUATTRO_FONT_STACK);
  });

  it("renders editor settings options", () => {
    (useAtom as any).mockImplementation((atom: any) => {
      const str = atom.toString();
      if (str === "atom_autosaveMode") return ["afterDelay", vi.fn()];
      return ["", vi.fn()];
    });
    render(<SettingsPage />);
    openEditorSection();

    expect(screen.getByText("Vim Mode")).toBeInTheDocument();
    expect(screen.getByText("Word Count")).toBeInTheDocument();
    expect(screen.getByText("Close Sidebar While Writing")).toBeInTheDocument();
    expect(screen.queryByText("Full Width")).not.toBeInTheDocument();
    // Palette-only toggles and the sidebar have no settings rows.
    expect(screen.queryByText("Word Wrap")).not.toBeInTheDocument();
    expect(screen.queryByText("Line Numbers")).not.toBeInTheDocument();
    expect(screen.queryByText("Show Invisibles")).not.toBeInTheDocument();
    expect(screen.queryByText("Show Sidebar")).not.toBeInTheDocument();
    expect(screen.queryByText("Collapse Frontmatter")).not.toBeInTheDocument();
    expect(screen.queryByText("Delay")).not.toBeInTheDocument();
  });

  it("renders file and autosave options in the Files section", () => {
    render(<SettingsPage />);
    openFilesSection();

    expect(screen.queryByText("On Vault Open")).not.toBeInTheDocument();
    expect(screen.getByText("New Files Folder")).toBeInTheDocument();
    expect(screen.getByText("Show Hidden Files")).toBeInTheDocument();
    expect(screen.getByText("Autosave Mode")).toBeInTheDocument();
    expect(screen.queryByText("Delay")).not.toBeInTheDocument();
  });

  it("has no Privacy section: Privacy Mode is the last group in Files", () => {
    render(<SettingsPage />);
    expect(screen.queryByText("Privacy")).not.toBeInTheDocument();

    openFilesSection();
    expect(screen.getByText("Privacy")).toBeInTheDocument();
    expect(screen.getByText("Privacy Mode")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mask in lists" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide from lists" })).toBeInTheDocument();
  });

  it("offers one Focus setting with three levels, none of them hiding the interface", () => {
    const setFocusMode = vi.fn();
    (useAtom as any).mockImplementation((atom: any) => {
      if (atom === atom_focusMode) return ["off", setFocusMode];
      return ["", vi.fn()];
    });
    render(<SettingsPage />);
    openEditorSection();

    expect(screen.queryByText("Flow Mode")).not.toBeInTheDocument();
    expect(screen.queryByText("Hide Interface While Typing")).not.toBeInTheDocument();
    const focus = screen.getByRole("combobox", { name: "Focus" });
    expect(focus).toHaveValue("off");
    expect(Array.from((focus as HTMLSelectElement).options).map((option) => option.text)).toEqual([
      "Off",
      "Dim other paragraphs",
      "Dim other sentences",
    ]);
    fireEvent.change(focus, { target: { value: "dim" } });
    expect(setFocusMode).toHaveBeenCalledWith("dim");
  });

  it("has no Toolbar group under Appearance", () => {
    render(<SettingsPage />);
    expect(screen.queryByText("Toolbar")).not.toBeInTheDocument();
    expect(screen.queryByText("Show Sidebar")).not.toBeInTheDocument();
  });

  it("offers only After Delay and Manual autosave", () => {
    render(<SettingsPage />);
    openFilesSection();

    const mode = screen.getByDisplayValue("After Delay") as HTMLSelectElement;
    expect(Array.from(mode.options).map((option) => option.value)).toEqual(["afterDelay", "manual"]);
  });

  it("names the AI settings plainly", () => {
    (useAtom as any).mockImplementation((atom: any) => {
      if (atom === atom_aiEnabled) return [true, vi.fn()];
      if (atom === atom_aiProvider) return ["claude", vi.fn()];
      if (atom === atom_claudeKey) return ["sk-ant-test", vi.fn()];
      if (atom === atom_availableClaudeModels) return [[], vi.fn()];
      return ["", vi.fn()];
    });
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("AI Features"));

    expect(screen.getByText(/Optional, and off unless you turn it on/)).toBeInTheDocument();
    expect(screen.getByText("Provider")).toBeInTheDocument();
    expect(screen.getByText("Model")).toBeInTheDocument();
    expect(screen.queryByText("Model Tier")).not.toBeInTheDocument();
    expect(screen.queryByText("Provider Config")).not.toBeInTheDocument();
  });

  it("puts profile and data first and help and about last in General, with no tour", () => {
    render(<SettingsPage />);
    expect(screen.queryByText("Guide")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("General"));

    const text = document.querySelector("main")!.textContent!;
    const order = ["Profile", "Your Data", "Help", "About"].map((title) => text.indexOf(title));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(screen.queryByText("Onboarding")).not.toBeInTheDocument();
    // A row with no control is plain text, not a setting.
    expect(screen.queryByText("Stored on This Device")).not.toBeInTheDocument();
    expect(screen.getByText(/There's no account/)).toBeInTheDocument();
  });

  it("goes back to the editor from its title bar", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByTitle("Back to editor"));
    expect(pushMock).toHaveBeenCalledWith("/editor");
  });

  it("keeps the open section in the URL", () => {
    window.history.replaceState(null, "", "/editor/settings");
    render(<SettingsPage />);

    openFilesSection();
    expect(window.location.search).toBe("?section=files");
    fireEvent.click(screen.getByText("Appearance"));
    expect(window.location.search).toBe("");
  });

  it("opens the section the URL names", () => {
    // The AI section needs a provider to list its models.
    (useAtom as any).mockImplementation((atom: any) => {
      if (atom === atom_aiProvider) return ["claude", vi.fn()];
      if (atom === atom_availableClaudeModels) return [[], vi.fn()];
      return ["", vi.fn()];
    });
    window.history.replaceState(null, "", "/editor/settings?section=ai");
    render(<SettingsPage />);

    expect(screen.getByRole("heading", { level: 2, name: "AI Features" })).toBeInTheDocument();
    window.history.replaceState(null, "", "/editor/settings");
  });
});
