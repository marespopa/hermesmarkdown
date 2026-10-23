import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import TaskDialog from "./TaskDialog";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("TaskDialog due-date presets", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 23, 12));
  });
  afterEach(() => vi.useRealTimers());

  function renderDialog() {
    const onConfirm = vi.fn();
    render(<TaskDialog isOpen onClose={vi.fn()} onConfirm={onConfirm} />);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Ship the release" } });
    return onConfirm;
  }

  it("marks the picked preset as selected and uses its date", () => {
    const onConfirm = renderDialog();
    const presets = screen.getByRole("group", { name: "Due date presets" });
    const tomorrow = screen.getByRole("button", { name: "Tomorrow" });
    expect(presets).toContainElement(tomorrow);
    expect(tomorrow).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(tomorrow);
    expect(tomorrow).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Today" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Insert" }));
    // The dialog writes local midnight as an ISO date, as here.
    const due = new Date(2026, 9, 24).toISOString().slice(0, 10);
    expect(onConfirm).toHaveBeenCalledWith(expect.stringContaining(`@due(${due})`));
  });

  it("clears the due date, leaving no preset selected", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    for (const name of ["Today", "Tomorrow", "+1 Week"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("aria-pressed", "false");
    }
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });
});
