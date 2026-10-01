import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ModeSwitch from "./ModeSwitch.component";

const OPTIONS = [
  { value: "edit", label: "Edit" },
  { value: "preview", label: "Preview" },
] as const;

type Mode = (typeof OPTIONS)[number]["value"];

function Controlled({ onChange }: { onChange?: (value: Mode) => void }) {
  const [value, setValue] = useState<Mode>("edit");
  return (
    <ModeSwitch
      options={OPTIONS}
      value={value}
      label="Editor mode"
      onChange={(next) => {
        onChange?.(next);
        setValue(next);
      }}
    />
  );
}

describe("ModeSwitch", () => {
  afterEach(cleanup);

  it("renders a labelled radio group with the current value checked", () => {
    render(<Controlled />);

    expect(screen.getByRole("radiogroup", { name: "Editor mode" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Edit" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Preview" })).toHaveAttribute("aria-checked", "false");
  });

  it("selects an option on click", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: "Preview" }));

    expect(onChange).toHaveBeenCalledWith("preview");
    expect(screen.getByRole("radio", { name: "Preview" })).toHaveAttribute("aria-checked", "true");
  });

  it("does not report a click on the option already selected", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: "Edit" }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("moves the selection with arrow keys, wrapping around", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole("radio", { name: "Edit" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("preview");
    expect(screen.getByRole("radio", { name: "Preview" })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("radio", { name: "Preview" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("edit");
  });

  it("keeps option names for screen readers when icon-only", () => {
    render(<ModeSwitch options={OPTIONS} value="edit" label="Editor mode" onChange={vi.fn()} iconOnly />);

    expect(screen.getByRole("radio", { name: "Preview" })).toBeInTheDocument();
    expect(screen.queryByText("Preview")).not.toBeInTheDocument();
  });
});
