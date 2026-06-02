import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import StatusBar from "./StatusBar";
import {
  atom_isZenModeActive,
  atom_isEditorFocused,
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

  it("has max-md:h-0 class when focused and NOT in Zen Mode", () => {
    render(
      <TestProvider
        initialValues={[
          [atom_showStats, true],
          [atom_isEditorFocused, true],
          [atom_isZenModeActive, false],
        ]}
      >
        <StatusBar />
      </TestProvider>
    );
    const footer = screen.getByRole("contentinfo");
    expect(footer.className).toContain("max-md:h-0");
  });

  it("does NOT have max-md:h-0 class when focused and IN Zen Mode", () => {
    render(
      <TestProvider
        initialValues={[
          [atom_showStats, true],
          [atom_isEditorFocused, true],
          [atom_isZenModeActive, true],
        ]}
      >
        <StatusBar />
      </TestProvider>
    );
    const footer = screen.getByRole("contentinfo");
    expect(footer.className).not.toContain("max-md:h-0");
    expect(footer.className).toContain("h-8 opacity-100");
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
