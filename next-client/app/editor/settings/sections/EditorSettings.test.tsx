import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { afterEach, describe, expect, it } from "vitest";
import { atom_showOutline } from "@/app/atoms/ui-atoms";
import EditorSettings from "./EditorSettings";

afterEach(cleanup);

describe("EditorSettings", () => {
  it("toggles the Outline", () => {
    const store = createStore();
    store.set(atom_showOutline, false);
    render(
      <Provider store={store}>
        <EditorSettings />
      </Provider>,
    );
    fireEvent.click(screen.getByRole("switch", { name: "Outline" }));
    expect(store.get(atom_showOutline)).toBe(true);
  });
});
