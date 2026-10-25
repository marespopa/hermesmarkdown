import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { afterEach, describe, expect, it } from "vitest";
import { atom_showGitChanges } from "@/app/atoms/git-atoms";
import EditorSettings from "./EditorSettings";

afterEach(cleanup);

describe("EditorSettings", () => {
  it("toggles Git Changes", () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <EditorSettings />
      </Provider>,
    );
    expect(store.get(atom_showGitChanges)).toBe(false);
    fireEvent.click(screen.getByRole("switch", { name: "Git Changes" }));
    expect(store.get(atom_showGitChanges)).toBe(true);
  });
});
