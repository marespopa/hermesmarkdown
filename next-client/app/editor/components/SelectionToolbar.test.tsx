import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it, vi } from "vitest";
import { atom_activeEditorView } from "@/app/atoms/ui-atoms";
import SelectionToolbar from "./SelectionToolbar";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

let view: EditorView | null = null;

// A real editor, with focus and coordinates faked (jsdom has no layout).
function makeView(doc: string, from: number, to: number) {
  view = new EditorView({
    state: EditorState.create({ doc, selection: EditorSelection.single(from, to) }),
    parent: document.body,
  });
  Object.defineProperty(view, "hasFocus", { get: () => true });
  view.coordsAtPos = () => ({ left: 100, right: 110, top: 200, bottom: 220 });
  return view;
}

function renderToolbar(target: EditorView, props: Partial<React.ComponentProps<typeof SelectionToolbar>> = {}) {
  const store = createStore();
  store.set(atom_activeEditorView, target);
  return render(
    <Provider store={store}>
      <SelectionToolbar placement="above" {...props} />
    </Provider>,
  );
}

afterEach(() => {
  view?.destroy();
  view = null;
});

describe("SelectionToolbar", () => {
  it("formats the selection without Ask AI when AI isn't configured", async () => {
    const v = makeView("make this bold", 5, 9);
    renderToolbar(v);

    fireEvent.click(await screen.findByRole("button", { name: "Bold" }));
    expect(v.state.doc.toString()).toBe("make **this** bold");
    expect(screen.getByRole("button", { name: "Italic" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Link" })).toBeTruthy();
    expect(screen.queryByText("Ask AI")).toBeNull();
  });

  it("turns the selected line into another block type from the Turn into menu", async () => {
    const v = makeView("Title", 0, 5);
    renderToolbar(v);

    const trigger = await screen.findByRole("button", { name: "Turn into" });
    expect(trigger.textContent).toContain("Text");
    fireEvent.click(trigger);
    expect(screen.getByRole("menuitemradio", { name: /Text/ }).getAttribute("aria-checked")).toBe("true");

    fireEvent.click(screen.getByRole("menuitemradio", { name: /Heading 2/ }));
    expect(v.state.doc.toString()).toBe("## Title");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes the Turn into menu on Escape without changing the line", async () => {
    const v = makeView("Title", 0, 5);
    renderToolbar(v);

    fireEvent.click(await screen.findByRole("button", { name: "Turn into" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(v.state.doc.toString()).toBe("Title");
  });

  it("offers Ask AI when configured, except while a request runs", async () => {
    const onAsk = vi.fn();
    const v = makeView("ask about this", 0, 3);
    const { rerender } = renderToolbar(v, { onAsk });

    fireEvent.click(await screen.findByText("Ask AI"));
    expect(onAsk).toHaveBeenCalled();

    const store = createStore();
    store.set(atom_activeEditorView, v);
    rerender(
      <Provider store={store}>
        <SelectionToolbar placement="above" onAsk={onAsk} isAiLoading />
      </Provider>,
    );
    expect(await screen.findByRole("button", { name: "Bold" })).toBeTruthy();
    expect(screen.queryByText("Ask AI")).toBeNull();
  });

  it("docks at the bottom on touch screens and opens Turn into upward", async () => {
    const v = makeView("Title", 0, 5);
    renderToolbar(v, { placement: "docked" });

    const toolbar = await screen.findByRole("toolbar");
    const anchor = toolbar.parentElement!;
    expect(anchor.style.bottom).toBe("12px");
    expect(anchor.style.top).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Turn into" }));
    expect(screen.getByRole("menu").className).toContain("bottom-full");
  });

  it("stays hidden without a selection", () => {
    renderToolbar(makeView("nothing selected", 3, 3));
    expect(screen.queryByRole("toolbar")).toBeNull();
  });
});
