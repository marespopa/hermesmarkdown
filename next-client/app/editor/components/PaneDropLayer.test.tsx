import { render, screen, fireEvent, createEvent, cleanup, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { Provider, createStore } from "jotai";
import PaneDropLayer from "./PaneDropLayer";
import { atom_paneDrag, type PaneDragPayload } from "@/app/atoms/pane-drag-atoms";

const dropOnPane = vi.fn();
vi.mock("../hooks/use-pane-drop", () => ({ usePaneDrop: () => dropOnPane }));

// jsdom has no DragEvent, so fireEvent ignores clientX/clientY: define them.
function dragEvent(type: "dragOver" | "drop", el: Element, x: number, y: number) {
  const event = createEvent[type](el);
  Object.defineProperty(event, "clientX", { value: x });
  Object.defineProperty(event, "clientY", { value: y });
  Object.defineProperty(event, "dataTransfer", { value: { dropEffect: "" } });
  fireEvent(el, event);
}

function renderLayer(payload: PaneDragPayload | null) {
  const store = createStore();
  store.set(atom_paneDrag, payload);
  render(
    <Provider store={store}>
      <PaneDropLayer paneId="p1" />
    </Provider>,
  );
  return store;
}

describe("PaneDropLayer", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders nothing without a drag", () => {
    renderLayer(null);
    expect(screen.queryByTestId("pane-drop-layer")).not.toBeInTheDocument();
  });

  it("renders nothing over the pane being dragged", () => {
    renderLayer({ kind: "pane", paneId: "p1" });
    expect(screen.queryByTestId("pane-drop-layer")).not.toBeInTheDocument();
  });

  it("drops with the zone under the pointer", () => {
    renderLayer({ kind: "open-note", path: "a.md", sourcePaneId: "other" });
    const layer = screen.getByTestId("pane-drop-layer");
    layer.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0, toJSON: () => ({}) });

    dragEvent("dragOver", layer, 10, 150);
    dragEvent("drop", layer, 10, 150);
    expect(dropOnPane).toHaveBeenLastCalledWith("p1", "left");

    dragEvent("drop", layer, 200, 150);
    expect(dropOnPane).toHaveBeenLastCalledWith("p1", "center");
  });

  it("draws the preview only while the pointer is over the pane", () => {
    renderLayer({ kind: "open-note", path: "a.md", sourcePaneId: "other" });
    const layer = screen.getByTestId("pane-drop-layer");
    expect(layer.children).toHaveLength(0);
    act(() => {
      dragEvent("dragOver", layer, 200, 150);
    });
    expect(layer.children).toHaveLength(1);
    fireEvent.dragLeave(layer, { relatedTarget: null });
    expect(layer.children).toHaveLength(0);
  });
});
