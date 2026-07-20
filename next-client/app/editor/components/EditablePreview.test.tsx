import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom";
import EditablePreview from "./EditablePreview";

afterEach(cleanup);

describe("EditablePreview", () => {
  it("does not call onChange just from mounting/loading content", async () => {
    const onChange = vi.fn();
    render(<EditablePreview content={"# Hello\n\nSome [[Wiki Link]] text.\n"} onChange={onChange} />);

    await waitFor(() => {
      expect(document.querySelector(".wikilink-text")).toBeInTheDocument();
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders wikilink text with the wikilink-text decoration class", async () => {
    render(<EditablePreview content={"Some [[Wiki Link]] text.\n"} onChange={() => {}} />);

    await waitFor(() => {
      const el = document.querySelector(".wikilink-text");
      expect(el).toBeInTheDocument();
      expect(el?.textContent).toBe("[[Wiki Link]]");
    });
  });
});
