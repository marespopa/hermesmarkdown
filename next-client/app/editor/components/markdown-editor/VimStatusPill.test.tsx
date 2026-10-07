import React, { useEffect, useRef, useState } from "react";
import { act, render, screen } from "@testing-library/react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { getCM, Vim, vim } from "@replit/codemirror-vim";
import { describe, expect, it } from "vitest";
import { useVimStatus } from "@/app/editor/hooks/use-vim-status";
import VimStatusPill from "./VimStatusPill";

let currentView: EditorView | null = null;

function Harness() {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<EditorView | null>(null);
  useEffect(() => {
    const created = new EditorView({
      parent: parentRef.current!,
      state: EditorState.create({ doc: "A note", extensions: [vim()] }),
    });
    currentView = created;
    setView(created);
    return () => created.destroy();
  }, []);
  const { hostRef, status } = useVimStatus(view, true);
  return (
    <>
      <div ref={parentRef} data-testid="editor" />
      <VimStatusPill status={status} hostRef={hostRef} />
    </>
  );
}

function press(key: string) {
  act(() => {
    currentView!.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
}

describe("VimStatusPill", () => {
  it("shows Normal mode and hides while inserting", () => {
    render(<Harness />);

    expect(screen.getByRole("status")).toHaveTextContent("Normal");

    press("i");
    expect(screen.queryByRole("status")).toBeNull();

    act(() => { Vim.handleKey(getCM(currentView!)!, "<Esc>", "user"); });
    expect(screen.getByRole("status")).toHaveTextContent("Normal");
  });

  it("shows Visual mode", () => {
    render(<Harness />);

    press("V");

    expect(screen.getByRole("status")).toHaveTextContent("Visual line");
  });

  it("opens the : prompt in the pill instead of a panel under the text", () => {
    const { container } = render(<Harness />);

    press(":");

    // The editor's content is a textbox too, so look inside the pill.
    expect(container.querySelector(".vim-status-host input")).toHaveFocus();
    expect(screen.getByTestId("editor").querySelector(".cm-vim-panel")).toBeNull();
  });
});
