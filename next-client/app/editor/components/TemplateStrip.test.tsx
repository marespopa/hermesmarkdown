import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import TemplateStrip from "./TemplateStrip";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("TemplateStrip", () => {
  it("names the template, links to the Templates page and adds a field", () => {
    const onAddField = vi.fn();
    render(<TemplateStrip name="Standup" doc="# {{title}}\n" onAddField={onAddField} />);
    expect(screen.getByText("Standup")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Templates page" })).toHaveAttribute("href", "/editor/templates");
    fireEvent.click(screen.getByRole("button", { name: "+ Add field" }));
    expect(onAddField).toHaveBeenCalledOnce();
  });
});
