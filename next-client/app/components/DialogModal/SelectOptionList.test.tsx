import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SelectOptionList from "./SelectOptionList";

const option = (label: string) => ({ label, value: `path:${label}` });

afterEach(cleanup);

describe("SelectOptionList", () => {
  it("lists a few options without a filter", () => {
    const onSelect = vi.fn();
    render(<SelectOptionList options={[option("Inbox"), option("Work")]} onSelect={onSelect} />);
    expect(screen.queryByLabelText("Filter")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "Work" }));
    expect(onSelect).toHaveBeenCalledWith("path:Work");
  });

  it("filters a long list as you type and picks with the arrow keys and Return", () => {
    const onSelect = vi.fn();
    const labels = ["Archive", "Archive/2025", "Archive/2026", "Inbox", "Journal", "Projects", "Work"];
    render(<SelectOptionList options={labels.map(option)} onSelect={onSelect} />);

    const filter = screen.getByLabelText("Filter");
    fireEvent.change(filter, { target: { value: "arch" } });
    expect(screen.getAllByRole("option").map((el) => el.textContent)).toEqual(["Archive", "Archive/2025", "Archive/2026"]);

    fireEvent.keyDown(filter, { key: "ArrowDown" });
    fireEvent.keyDown(filter, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("path:Archive/2025");

    fireEvent.change(filter, { target: { value: "nothing" } });
    expect(screen.getByText("No matches")).toBeInTheDocument();
  });
});
