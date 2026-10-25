import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import FrontmatterStatusMenu from "./FrontmatterStatusMenu";

afterEach(cleanup);

const items = () => screen.getAllByRole("menuitemcheckbox", { hidden: true });

describe("FrontmatterStatusMenu", () => {
  it("lists the seven known statuses and checks the current one", () => {
    render(<FrontmatterStatusMenu x={10} y={10} current="done" onSelect={vi.fn()} onClose={vi.fn()} />);
    const labels = ["todo", "in-progress", "done", "draft", "review", "active", "archived"];
    for (const label of labels) expect(screen.getByText(label)).toBeInTheDocument();
    expect(items().filter((item) => item.getAttribute("aria-checked") === "true")).toHaveLength(1);
    expect(screen.getByText("done").closest("[aria-checked]")).toHaveAttribute("aria-checked", "true");
  });

  it("lists an unknown current value first", () => {
    render(<FrontmatterStatusMenu x={10} y={10} current="blocked" onSelect={vi.fn()} onClose={vi.fn()} />);
    const all = screen.getAllByText(/^(blocked|todo|in-progress|done|draft|review|active|archived)$/).map((node) => node.textContent);
    expect(all[0]).toBe("blocked");
    expect(all).toHaveLength(8);
  });

  it("selects a status and closes on Escape", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<FrontmatterStatusMenu x={10} y={10} current="todo" onSelect={onSelect} onClose={onClose} />);
    fireEvent.click(screen.getByText("review"));
    expect(onSelect).toHaveBeenCalledWith("review");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
