import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import SearchPill from "./SearchPill";

const palette = vi.hoisted(() => ({ value: null as null | { open: () => void; isOpen: boolean } }));

vi.mock("@/app/components/CommandPalette/CommandPaletteContext", () => ({
  PALETTE_SEARCH_TRANSITION: "palette-search",
  useOptionalCommandPalette: () => palette.value,
}));

describe("SearchPill", () => {
  it("opens the command palette", () => {
    const open = vi.fn();
    palette.value = { open, isOpen: false };
    render(<SearchPill />);
    fireEvent.click(screen.getByRole("button", { name: "Search or create a file…" }));
    expect(open).toHaveBeenCalledOnce();
  });

  it("is the palette's morph anchor, and steps aside while the palette is open", () => {
    palette.value = { open: vi.fn(), isOpen: true };
    const { container } = render(<SearchPill />);
    const pill = container.querySelector("[data-palette-anchor]");
    expect(pill).toHaveClass("invisible");
  });

  it("renders nothing outside the palette's provider", () => {
    palette.value = null;
    const { container } = render(<SearchPill />);
    expect(container).toBeEmptyDOMElement();
  });
});
