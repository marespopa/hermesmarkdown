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

// Row text without the ⌘1 / Ctrl+1 shortcut hint.
const rowNames = () =>
  screen.getAllByRole("option").map((row) => row.textContent?.replace(/(⌘|Ctrl\+)\d$/, ""));

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

  it("shows a starter's description instead of a path and picks the starter", () => {
    const starters = [{ name: "Spec", description: "Author, status, summary" }];
    const { onPick } = renderPicker({ templates: starters, title: "New template" });
    expect(rowNames()).toEqual(["SpecAuthor, status, summary"]);
    fireEvent.click(screen.getByText("Spec"));
    expect(onPick).toHaveBeenCalledWith(starters[0]);
  });

  it("picks a clicked row", () => {
    const { onPick } = renderPicker();
    fireEvent.click(screen.getByText("meeting"));
    expect(onPick).toHaveBeenCalledWith(templates[0]);
  });

  it("picks a row with Cmd/Ctrl + its number", () => {
    const { onPick } = renderPicker();
    fireEvent.keyDown(screen.getByLabelText("Search templates"), { key: "2", ctrlKey: true });
    expect(onPick).toHaveBeenCalledWith(templates[1]);
  });

  it("summarizes each template from its text and previews the highlighted one", () => {
    renderPicker({
      bodies: {
        "templates/meeting.md": "# {{title}}\n## Agenda\n- [ ] \n## Notes\nOwner: {{prompt:Owner}}\n",
        "templates/rfc.md": null,
      },
    });
    expect(rowNames()[0]).toBe("meeting2 sections • Action items • Asks Owner");
    const preview = screen.getByLabelText("Preview of meeting");
    expect(preview).toHaveTextContent("Agenda");
    expect(preview).toHaveTextContent("Owner");
    fireEvent.keyDown(screen.getByLabelText("Search templates"), { key: "ArrowDown" });
    expect(screen.getByLabelText("Preview of rfc")).toHaveTextContent("Loading…");
  });

  it("has no preview pane without bodies", () => {
    renderPicker();
    expect(screen.queryByLabelText(/^Preview of/)).not.toBeInTheDocument();
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
