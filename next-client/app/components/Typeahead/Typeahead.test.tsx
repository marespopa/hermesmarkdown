import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import Typeahead from "./Typeahead";

// Suggestions render through a Portal into document.body, so a real browser
// fires `mousedown` on a suggestion before `click`. The document-level
// "click outside" listener used to only check the input's container, not the
// portal-rendered list, so that mousedown was treated as an outside click —
// closing (unmounting) the list before its `click` handler could fire.
const selectSuggestion = (el: HTMLElement) => {
  fireEvent.mouseDown(el);
  fireEvent.click(el);
};

describe("Typeahead", () => {
  it("calls onChange with the full option when a suggestion is selected via mousedown+click", () => {
    const handleChange = vi.fn();
    render(
      <Typeahead
        name="tag"
        value="wo"
        onChange={handleChange}
        options={["work", "workout", "personal"]}
      />,
    );

    fireEvent.focus(screen.getByRole("textbox"));
    selectSuggestion(screen.getByText("work"));

    expect(handleChange).toHaveBeenCalledWith("work");
  });

  it("closes the dropdown after a selection", () => {
    const handleChange = vi.fn();
    render(
      <Typeahead
        name="tag"
        value="wo"
        onChange={handleChange}
        options={["work", "workout"]}
      />,
    );

    fireEvent.focus(screen.getByRole("textbox"));
    expect(screen.getByText("workout")).toBeInTheDocument();

    selectSuggestion(screen.getByText("work"));

    expect(screen.queryByText("workout")).not.toBeInTheDocument();
  });

  it("appends comma-separated selections when allowMultiple is true", () => {
    const handleChange = vi.fn();
    render(
      <Typeahead
        name="tags"
        value="personal, wo"
        onChange={handleChange}
        options={["work", "workout", "personal"]}
        allowMultiple
      />,
    );

    fireEvent.focus(screen.getByRole("textbox"));
    selectSuggestion(screen.getByText("work"));

    expect(handleChange).toHaveBeenCalledWith("personal, work");
  });

  it("still closes the dropdown on a genuine outside click", () => {
    const handleChange = vi.fn();
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <Typeahead
          name="tag"
          value="wo"
          onChange={handleChange}
          options={["work", "workout"]}
        />
      </div>,
    );

    fireEvent.focus(screen.getByRole("textbox"));
    expect(screen.getByText("work")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));

    expect(screen.queryByText("work")).not.toBeInTheDocument();
  });
});
