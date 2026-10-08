import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LinkPill } from "./LinkPill";

function renderPill(type: "url" | "wiki") {
  const handlers = { onOpen: vi.fn(), onSave: vi.fn(), onDismiss: vi.fn() };
  render(
    <LinkPill
      url={type === "url" ? "https://example.com" : "Project Notes"}
      label={type === "url" ? "the guide" : ""}
      pos={{ top: 0, left: 0 }}
      type={type}
      {...handlers}
    />,
  );
  return handlers;
}

describe("LinkPill", () => {
  it("edits a URL link's text and target in a dialog", () => {
    const { onSave } = renderPill("url");
    fireEvent.click(screen.getByTitle("Edit link"));
    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "The Guide" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith("The Guide", "https://example.com");
  });

  it("offers only Open on a wikilink, whose text is edited in place", () => {
    const { onOpen } = renderPill("wiki");
    expect(screen.queryByTitle("Edit link")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle(/Open note/));
    expect(onOpen).toHaveBeenCalled();
  });
});
