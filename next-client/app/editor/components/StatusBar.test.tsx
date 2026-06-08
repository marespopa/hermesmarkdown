import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { expect, it, describe, vi } from "vitest";

// Mock atoms as primitive so useHydrateAtoms can seed them.
// atom_content / atom_lastSavedContent / atom_activeFilePath are derived atoms
// in production — they can't be directly hydrated. The mocks swap them for
// plain atoms that behave identically in unit-test scope.
vi.mock("@/app/atoms/atoms", async () => {
  const { atom } = await import("jotai");
  return {
    atom_content:          atom("Hello world"),
    atom_lastSavedContent: atom("Hello world"),
    atom_saveStatus:       atom({ state: "idle", retryCount: 0 }),
    atom_showStats:        atom(true),
    atom_isZenModeActive:  atom(false),
    atom_selectionCount:   atom(0),
    atom_activeFilePath:   atom("file.md"),
  };
});

vi.mock("@/app/atoms/ui-atoms", async () => {
  const { atom } = await import("jotai");
  return {
    atom_indexerState: atom("idle"),
  };
});

// Import after mocks are registered so StatusBar receives mocked atoms.
import StatusBar from "./StatusBar";
import {
  atom_isZenModeActive,
  atom_showStats,
  atom_saveStatus,
  atom_selectionCount,
  atom_content,
  atom_lastSavedContent,
  atom_activeFilePath,
} from "@/app/atoms/atoms";

import {
  atom_indexerState,
} from "@/app/atoms/ui-atoms";

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

function makeValues(overrides: any[] = []) {
  const base: any[] = [
    [atom_showStats,        true],
    [atom_isZenModeActive,  false],
    [atom_saveStatus,       { state: "idle", retryCount: 0 }],
    [atom_selectionCount,   0],
    [atom_content,          "Hello world"],
    [atom_lastSavedContent, "Hello world"],
    [atom_activeFilePath,   "file.md"],
  ];
  const overrideMap = new Map(overrides.map(([a, v]: any[]) => [a, v]));
  return base.map(([a, v]: any[]) => overrideMap.has(a) ? [a, overrideMap.get(a)] : [a, v]);
}

describe("StatusBar", () => {
  it("renders when showStats is true", () => {
    render(
      <TestProvider initialValues={makeValues()}>
        <StatusBar />
      </TestProvider>
    );
    expect(screen.getByRole("contentinfo")).toBeDefined();
  });

  it("does not render when showStats is false and zen mode is off", () => {
    render(
      <TestProvider initialValues={[[atom_showStats, false], [atom_isZenModeActive, false]]}>
        <StatusBar />
      </TestProvider>
    );
    expect(screen.queryByRole("contentinfo")).toBeNull();
    expect(screen.queryByRole("banner")).toBeNull();
  });

  it("shows ✓ Saved when content matches lastSavedContent", () => {
    render(
      <TestProvider initialValues={makeValues([
        [atom_content,          "Hello world"],
        [atom_lastSavedContent, "Hello world"],
      ])}>
        <StatusBar />
      </TestProvider>
    );
    expect(screen.getByText("✓ Saved")).toBeDefined();
  });

  it("shows • Unsaved when content differs from lastSavedContent", () => {
    render(
      <TestProvider initialValues={makeValues([
        [atom_content,          "Hello world edited"],
        [atom_lastSavedContent, "Hello world"],
      ])}>
        <StatusBar />
      </TestProvider>
    );
    expect(screen.getByText("• Unsaved")).toBeDefined();
  });

  it("shows Saving… when saveStatus is saving", () => {
    render(
      <TestProvider initialValues={makeValues([
        [atom_saveStatus, { state: "saving", retryCount: 0 }],
      ])}>
        <StatusBar />
      </TestProvider>
    );
    expect(screen.getByText("Saving…")).toBeDefined();
  });

  it("shows ⚠ Error when saveStatus is error", () => {
    render(
      <TestProvider initialValues={makeValues([
        [atom_saveStatus, { state: "error", retryCount: 0 }],
      ])}>
        <StatusBar />
      </TestProvider>
    );
    expect(screen.getByText("⚠ Error")).toBeDefined();
  });

  it("shows selection word count in brackets when selectionCount > 0", () => {
    render(
      <TestProvider initialValues={makeValues([[atom_selectionCount, 5]])}>
        <StatusBar />
      </TestProvider>
    );
    expect(screen.getByRole("contentinfo").textContent).toContain("[5]");
  });

  it("shows metric count when selectionCount is 0", () => {
    render(
      <TestProvider initialValues={makeValues([
        [atom_content,          "hello world foo"],
        [atom_lastSavedContent, "hello world foo"],
        [atom_selectionCount,   0],
      ])}>
        <StatusBar />
      </TestProvider>
    );
    const text = screen.getByRole("contentinfo").textContent ?? "";
    expect(text.includes("words") || text.includes("tokens")).toBe(true);
  });

  it("shows AI: label in the footer", () => {
    render(
      <TestProvider initialValues={makeValues()}>
        <StatusBar />
      </TestProvider>
    );
    expect(screen.getByRole("contentinfo").textContent).toContain("AI:");
  });

  it("shows AI: Empty for blank content", () => {
    render(
      <TestProvider initialValues={makeValues([
        [atom_content,          "   "],
        [atom_lastSavedContent, "   "],
      ])}>
        <StatusBar />
      </TestProvider>
    );
    expect(screen.getByRole("contentinfo").textContent).toContain("AI: Empty");
  });

  it("shows AI: Structured for a fully agent-readable document", () => {
    const structured = [
      "---",
      "id: 20260607-test",
      "title: Test Document",
      "status: active",
      "tags: [testing, agent]",
      "version: 1.0.0",
      "---",
      "",
      "# Overview",
      "",
      "**Important:** This document is structured for agent consumption.",
      "",
      "## Background",
      "",
      "Some context here.",
      "",
      "### Details",
      "",
      "- Item one",
      "- Item two",
      "",
      "```typescript",
      "const x = 1;",
      "```",
      "",
      "| Column A | Column B |",
      "| -------- | -------- |",
      "| Value 1  | Value 2  |",
    ].join("\n");

    render(
      <TestProvider initialValues={makeValues([
        [atom_content,          structured],
        [atom_lastSavedContent, structured],
      ])}>
        <StatusBar />
      </TestProvider>
    );
    expect(screen.getByRole("contentinfo").textContent).toContain("AI: Structured");
  });

  it("shows AI: Weak for plain unstructured text", () => {
    render(
      <TestProvider initialValues={makeValues([
        [atom_content,          "Just some plain text without any structure or headings."],
        [atom_lastSavedContent, "Just some plain text without any structure or headings."],
      ])}>
        <StatusBar />
      </TestProvider>
    );
    expect(screen.getByRole("contentinfo").textContent).toContain("AI: Weak");
  });

  it("renders a header (top bar) in zen mode", () => {
    render(
      <TestProvider initialValues={makeValues([[atom_isZenModeActive, true]])}>
        <StatusBar />
      </TestProvider>
    );
    expect(screen.getByRole("banner")).toBeDefined();
    expect(screen.queryByRole("contentinfo")).toBeNull();
  });

  it("renders zen bar even when showStats is false", () => {
    render(
      <TestProvider initialValues={makeValues([
        [atom_showStats,       false],
        [atom_isZenModeActive, true],
      ])}>
        <StatusBar />
      </TestProvider>
    );
    expect(screen.getByRole("banner")).toBeDefined();
  });

  it("shows Exit button in zen mode", () => {
    render(
      <TestProvider initialValues={makeValues([[atom_isZenModeActive, true]])}>
        <StatusBar />
      </TestProvider>
    );
    expect(screen.getByText("Exit")).toBeDefined();
  });

  it("shows Indexing text and count when indexerState is compiling", () => {
    render(
      <TestProvider initialValues={[
        ...makeValues(),
        [atom_indexerState, { status: "compiling", count: 42 }]
      ]}>
        <StatusBar />
      </TestProvider>
    );
    expect(screen.getByText("Indexing")).toBeDefined();
    expect(screen.getByText("42")).toBeDefined();
  });
});
