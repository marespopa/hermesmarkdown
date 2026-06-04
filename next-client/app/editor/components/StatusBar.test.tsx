import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import StatusBar from "./StatusBar";
import {
  atom_isZenModeActive,
  atom_showStats,
} from "@/app/atoms/atoms";
import { expect, it, describe, vi } from "vitest";

// Mock resize observer
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

const HydrateAtoms = ({ initialValues, children }: any) => {
  useHydrateAtoms(initialValues);
  return children;
};

const TestProvider = ({ initialValues, children }: any) => (
  <Provider>
    <HydrateAtoms initialValues={initialValues}>{children}</HydrateAtoms>
  </Provider>
);

describe("StatusBar", () => {
  it("renders when showStats is true", () => {
    render(
      <TestProvider initialValues={[[atom_showStats, true]]}>
        <StatusBar />
      </TestProvider>
    );
    expect(screen.getByRole("contentinfo")).toBeDefined();
  });

  it("does not render when showStats is false", () => {
    render(
      <TestProvider initialValues={[[atom_showStats, false]]}>
        <StatusBar />
      </TestProvider>
    );
    expect(screen.queryByRole("contentinfo")).toBeNull();
  });

  it("does NOT have border-t class when IN Zen Mode", () => {
    render(
      <TestProvider
        initialValues={[
          [atom_showStats, true],
          [atom_isZenModeActive, true],
        ]}
      >
        <StatusBar />
      </TestProvider>
    );
    const footer = screen.getByRole("contentinfo");
    expect(footer.className).not.toContain("md:border-t");
    expect(footer.className).toContain("border-b");
  });

  it("has border-t class when NOT in Zen Mode (on desktop)", () => {
    render(
      <TestProvider
        initialValues={[
          [atom_showStats, true],
          [atom_isZenModeActive, false],
        ]}
      >
        <StatusBar />
      </TestProvider>
    );
    const footer = screen.getByRole("contentinfo");
    expect(footer.className).toContain("md:border-t");
    expect(footer.className).toContain("max-md:border-b");
  });

  it("renders Zen toggle even if showStats is false, if Zen Mode is active", () => {
    render(
      <TestProvider
        initialValues={[
          [atom_showStats, false],
          [atom_isZenModeActive, true],
        ]}
      >
        <StatusBar />
      </TestProvider>
    );
    expect(screen.getByRole("contentinfo")).toBeDefined();
    expect(screen.getByTitle(/Toggle Zen Mode/)).toBeDefined();
  });
});
