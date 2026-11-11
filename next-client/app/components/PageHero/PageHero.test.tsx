import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const back = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ back }) }));

import PageHero from "./PageHero";

describe("PageHero", () => {
  it("shows the headline with its tail and the intro", () => {
    render(<PageHero title="Privacy" accent="Policy." intro="Your notes stay yours." />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Privacy Policy.");
    expect(screen.getByText("Your notes stay yours.")).toBeTruthy();
  });

  it("has no Back button unless asked", () => {
    render(<PageHero title="Docs" intro="x" />);
    expect(screen.queryByText(/Back/)).toBeNull();
  });

  it("goes back when Back is clicked", () => {
    render(<PageHero showBack title="Terms" intro="x" />);
    screen.getByText(/Back/).click();
    expect(back).toHaveBeenCalled();
  });

  it("renders children under the intro", () => {
    render(<PageHero title="Docs" intro="x"><input aria-label="Search" /></PageHero>);
    expect(screen.getByLabelText("Search")).toBeTruthy();
  });
});
