import { act, render, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider, createStore } from "jotai";
import React from "react";
import WorkspaceSplitter from "./WorkspaceSplitter";
import { atom_workspaceLayout } from "@/app/atoms/atoms";
import type { WorkspaceContainer } from "@/app/types/workspace";

const recorded = vi.hoisted(() => ({
  group: null as null | { onLayoutChanged?: (layout: Record<string, number>) => void },
  panels: [] as { id?: string; defaultSize?: unknown; minSize?: unknown }[],
}));

vi.mock("react-resizable-panels", () => ({
  Group: (props: { children: React.ReactNode; onLayoutChanged?: (layout: Record<string, number>) => void }) => {
    React.useEffect(() => {
      recorded.group = props;
    });
    return <div>{props.children}</div>;
  },
  Panel: (props: { children: React.ReactNode; id?: string; defaultSize?: unknown; minSize?: unknown }) => {
    React.useEffect(() => {
      recorded.panels.push({ id: props.id, defaultSize: props.defaultSize, minSize: props.minSize });
    }, [props.id, props.defaultSize, props.minSize]);
    return <div>{props.children}</div>;
  },
  Separator: () => <div role="separator" />,
}));

vi.mock("./PaneLeaf", () => ({ default: ({ leaf }: { leaf: { id: string } }) => <div data-testid={`leaf-${leaf.id}`} /> }));

const tree: WorkspaceContainer = {
  id: "split",
  direction: "horizontal",
  sizes: [70, 30],
  children: [
    { id: "a", type: "editor", openFilePaths: [], isPinned: false },
    { id: "b", type: "editor", openFilePaths: [], isPinned: false },
  ],
};

describe("WorkspaceSplitter", () => {
  beforeEach(() => {
    cleanup();
    recorded.group = null;
    recorded.panels = [];
  });

  function renderTree() {
    const store = createStore();
    store.set(atom_workspaceLayout, { version: 2, rootContainer: tree });
    render(
      <Provider store={store}>
        <WorkspaceSplitter node={tree} />
      </Provider>,
    );
    return store;
  }

  it("gives panels percentage string sizes and a 10% minimum", () => {
    renderTree();
    expect(recorded.panels.map((p) => p.defaultSize)).toEqual(["70%", "30%"]);
    expect(recorded.panels.every((p) => p.minSize === "10%")).toBe(true);
  });

  it("persists the sizes a divider drag reports", () => {
    const store = renderTree();
    act(() => recorded.group?.onLayoutChanged?.({ a: 60, b: 40 }));
    expect((store.get(atom_workspaceLayout).rootContainer as WorkspaceContainer).sizes).toEqual([60, 40]);
  });
});
