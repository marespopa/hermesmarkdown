import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import CornerButton from "./CornerButton";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("CornerButton", () => {
  it("is a named button that runs its action", () => {
    const onClick = vi.fn();
    render(<CornerButton icon={<svg />} label="Copy Contents" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy Contents" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("passes pressed and disabled states to the button", () => {
    render(<CornerButton icon={<svg />} label="Mode" aria-pressed isDisabled />);
    const button = screen.getByRole("button", { name: "Mode" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toBeDisabled();
  });

  it("is a named link with an address", () => {
    render(<CornerButton icon={<svg />} label="Documentation" href="/documentation" />);
    expect(screen.getByRole("link", { name: "Documentation" })).toHaveAttribute("href", "/documentation");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
