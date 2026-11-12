import { act, createEvent, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createStore, Provider } from "jotai";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atom_pageOnly } from "@/app/atoms/ui-atoms";
import PageOnlyPeek, { PEEK_EDGE, PEEK_MS, PEEK_ROW_ATTRIBUTE } from "./PageOnlyPeek";

const peeking = () => document.documentElement.hasAttribute("data-page-only-peek");

function setup(pageOnly = true) {
  const store = createStore();
  store.set(atom_pageOnly, pageOnly);
  const Wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  render(
    <>
      <PageOnlyPeek />
      <div {...{ [PEEK_ROW_ATTRIBUTE]: "" }}><button>inside row</button></div>
      <p>page text</p>
    </>,
    { wrapper: Wrapper },
  );
  return store;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  document.documentElement.removeAttribute("data-page-only-peek");
});

describe("PageOnlyPeek", () => {
  it("is there outside No Distraction Mode too: the corner buttons rest invisible", () => {
    setup(false);
    expect(screen.getByTestId("page-only-peek")).toBeInTheDocument();
  });

  // A point on the top edge, and one in the page below it.
  const EDGE = { clientY: PEEK_EDGE - 1 };
  const BELOW = { clientY: PEEK_EDGE + 100 };
  // jsdom has no PointerEvent: build the press and give it its position.
  const press = (target: Element, clientY: number) => {
    const event = createEvent.pointerDown(target);
    Object.defineProperty(event, "clientY", { value: clientY });
    fireEvent(target, event);
  };

  it("takes no pointer events itself, so the pane's title under the top edge stays clickable", () => {
    setup(false);
    expect(screen.getByTestId("page-only-peek")).toHaveClass("pointer-events-none");
    // A click on something in that band (the title) still brings the row back.
    fireEvent.click(screen.getByText("page text"), EDGE);
    expect(peeking()).toBe(true);
  });

  it("brings the row back on a finished tap of the top edge, then puts it away", () => {
    setup();
    fireEvent.click(document.body, EDGE);
    expect(peeking()).toBe(true);
    act(() => { vi.advanceTimersByTime(PEEK_MS); });
    expect(peeking()).toBe(false);
  });

  it("does not bring the row back on the press, so the tap can't land on what appears", () => {
    setup();
    press(document.body, EDGE.clientY);
    fireEvent.mouseDown(document.body, EDGE);
    expect(peeking()).toBe(false);
  });

  it("answers a mouse moving on the top edge, and not one below it", () => {
    setup();
    fireEvent.mouseMove(document.body, BELOW);
    fireEvent.click(document.body, BELOW);
    expect(peeking()).toBe(false);
    fireEvent.mouseMove(document.body, EDGE);
    expect(peeking()).toBe(true);
  });

  it("keeps it while the row or the edge is used and puts it away on a press elsewhere", () => {
    setup();
    fireEvent.click(document.body, EDGE);
    act(() => { vi.advanceTimersByTime(PEEK_MS - 500); });
    press(screen.getByText("inside row"), BELOW.clientY);
    act(() => { vi.advanceTimersByTime(PEEK_MS - 500); });
    expect(peeking()).toBe(true);
    press(document.body, EDGE.clientY);
    act(() => { vi.advanceTimersByTime(PEEK_MS - 500); });
    expect(peeking()).toBe(true);
    press(screen.getByText("page text"), BELOW.clientY);
    expect(peeking()).toBe(false);
  });

  it("puts the row away when the mode is switched off", () => {
    const store = setup();
    fireEvent.click(document.body, EDGE);
    act(() => { store.set(atom_pageOnly, false); });
    expect(peeking()).toBe(false);
  });
});
