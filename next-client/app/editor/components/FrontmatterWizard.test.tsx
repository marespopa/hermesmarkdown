import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import FrontmatterWizard from "./FrontmatterWizard";
import { Provider } from "jotai";
import "@testing-library/jest-dom";

// Stable atom instances — must not be re-created per render or Jotai
// will treat each call as a new subscription and spin forever.
vi.mock("@/app/atoms/ui-atoms", async () => {
  const { atom } = await import("jotai");
  return {
    atom_frontmatterWizardOpen: atom<string | null>("test.md"),
    atom_isAiConfigured: atom(true),
  };
});

vi.mock("@/app/atoms/file-atoms", async () => {
  const { atom } = await import("jotai");
  const stableAtom = atom("---\ntitle: Test\n---\nBody content");
  return {
    atom_fileContent: () => stableAtom,
  };
});

vi.mock("@/app/atoms/metadata", async () => {
  const { atom } = await import("jotai");
  return {
    atom_fileMetadata: atom({}),
  };
});

vi.mock("@/app/services/ai", () => ({
  callAI: vi.fn(),
  generateFrontmatterData: vi.fn(),
}));

describe("FrontmatterWizard AI Visibility", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows AI Magic button when AI is configured", () => {
    render(
      <Provider>
        <FrontmatterWizard />
      </Provider>
    );
    expect(screen.getByText("AI Magic")).toBeInTheDocument();
  });
});
