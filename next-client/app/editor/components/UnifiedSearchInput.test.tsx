import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import UnifiedSearchInput from "./UnifiedSearchInput";

describe("UnifiedSearchInput", () => {
  it("shows a selected tag as a #tag pill and removes it on mousedown", () => {
    const onTokenRemove = vi.fn();
    render(
      <UnifiedSearchInput
        tokens={["idea"]} text="" allTags={["idea"]}
        onTokenAdd={vi.fn()} onTokenRemove={onTokenRemove} onTextChange={vi.fn()}
      />,
    );
    expect(screen.getByText("#idea")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("button", { name: "Remove idea" }));
    expect(onTokenRemove).toHaveBeenCalledWith("idea");
  });
});
