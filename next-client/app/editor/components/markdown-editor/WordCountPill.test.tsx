import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EditorView } from "@codemirror/view";
import WordCountPill, { WORD_COUNT_PAUSE } from "./WordCountPill";

function fakeView() {
  const dom = document.createElement("div");
  document.body.appendChild(dom);
  return { dom } as unknown as EditorView;
}

const pill = () => screen.getByRole("status", { hidden: true });

describe("WordCountPill", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows the note's word count", () => {
    render(<WordCountPill view={fakeView()} text="Draft the launch checklist" />);
    expect(pill()).toHaveTextContent("4 words");
    expect(pill()).toHaveAttribute("aria-hidden", "false");
  });

  it("says word for a single word", () => {
    render(<WordCountPill view={fakeView()} text="Roadmap" />);
    expect(pill()).toHaveTextContent("1 word");
  });

  it("stays hidden on an empty note", () => {
    render(<WordCountPill view={fakeView()} text="" />);
    expect(pill()).toHaveAttribute("aria-hidden", "true");
  });

  it("hides while typing and comes back after a pause", () => {
    const view = fakeView();
    const { rerender } = render(<WordCountPill view={view} text="Ship" />);
    act(() => { view.dom.dispatchEvent(new Event("beforeinput")); });
    rerender(<WordCountPill view={view} text="Ship the release" />);
    expect(pill()).toHaveAttribute("aria-hidden", "true");

    act(() => { vi.advanceTimersByTime(WORD_COUNT_PAUSE); });
    expect(pill()).toHaveAttribute("aria-hidden", "false");
    expect(pill()).toHaveTextContent("3 words");
  });

  it("comes back at once when the mouse moves", () => {
    const view = fakeView();
    render(<WordCountPill view={view} text="Ship the release" />);
    act(() => { view.dom.dispatchEvent(new Event("beforeinput")); });
    expect(pill()).toHaveAttribute("aria-hidden", "true");

    fireEvent.mouseMove(document);
    expect(pill()).toHaveAttribute("aria-hidden", "false");
  });
});
