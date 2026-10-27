import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import PageHelpLink from "./PageHelpLink";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("PageHelpLink", () => {
  it("links to the page's documentation, named by what it explains", () => {
    render(<PageHelpLink href="/documentation#tasks-page" label="How to use the Tasks page" />);
    expect(screen.getByRole("link", { name: "Help: How to use the Tasks page" })).toHaveAttribute("href", "/documentation#tasks-page");
  });
});
