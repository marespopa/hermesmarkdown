import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Provider } from "jotai";
import TemplatePicker from "./TemplatePicker";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const templates = [
  { name: "meeting", path: "templates/meeting.md" },
  { name: "rfc", path: "templates/rfc.md" },
];

function renderPicker(props: Partial<React.ComponentProps<typeof TemplatePicker>> = {}) {
  const onPick = vi.fn();
  const onCancel = vi.fn();
  render(
    <Provider>
      <TemplatePicker
        isOpen
        title="Insert template"
        templates={templates}
        folder="templates"
        includeBlank={false}
        onPick={onPick}
        onCancel={onCancel}
        {...props}
      />
    </Provider>,
  );
  return { onPick, onCancel };
}

const rowNames = () => screen.getAllByRole("option").map((row) => row.textContent);

describe("TemplatePicker", () => {
  it("filters by a case-insensitive substring of the name", () => {
    renderPicker();
    fireEvent.change(screen.getByLabelText("Search templates"), { target: { value: "RF" } });
    expect(rowNames()).toEqual(["rfctemplates/rfc.md"]);
  });

  it("moves with the arrow keys and picks with Enter", () => {
    const { onPick } = renderPicker();
    const search = screen.getByLabelText("Search templates");
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onPick).toHaveBeenCalledWith(templates[1]);
  });

  it("picks a clicked row", () => {
    const { onPick } = renderPicker();
    fireEvent.click(screen.getByText("meeting"));
    expect(onPick).toHaveBeenCalledWith(templates[0]);
  });

  it("cancels on Escape", () => {
    const { onCancel, onPick } = renderPicker();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalled();
    expect(onPick).not.toHaveBeenCalled();
  });

  it("shows Blank note first only when asked", () => {
    renderPicker({ includeBlank: true });
    expect(rowNames()[0]).toBe("Blank note");
  });

  it("has no Blank note row by default", () => {
    renderPicker();
    expect(screen.queryByText("Blank note")).not.toBeInTheDocument();
  });

  it("picks Blank note as 'blank'", () => {
    const { onPick } = renderPicker({ includeBlank: true });
    fireEvent.click(screen.getByText("Blank note"));
    expect(onPick).toHaveBeenCalledWith("blank");
  });

  it("offers only Blank note when the vault has no templates", () => {
    renderPicker({ includeBlank: true, templates: [] });
    expect(rowNames()).toEqual(["Blank note"]);
  });

  it("shows the empty state without templates", () => {
    renderPicker({ templates: [], folder: "_tpl" });
    expect(screen.getByText("No templates in _tpl/")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });
});
