import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { routeSkeleton } from "./RouteSkeletons";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/editor/changes" }));

describe("routeSkeleton", () => {
  it("returns the Changes skeleton for /editor/changes", () => {
    render(<>{routeSkeleton("/editor/changes")}</>);
    expect(screen.getByText("Changes")).toBeInTheDocument();
  });

  it("returns null for the editor itself", () => {
    expect(routeSkeleton("/editor")).toBeNull();
  });
});
