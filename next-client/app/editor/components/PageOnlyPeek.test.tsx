import { act, createEvent, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createStore, Provider } from "jotai";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atom_pageOnly } from "@/app/atoms/ui-atoms";
import PageOnlyPeek, { PEEK_MS, PEEK_ROW_ATTRIBUTE } from "./PageOnlyPeek";

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

  // jsdom has no PointerEvent: build the event and give it its pointer type.
  const hover = (target: Element, pointerType: string) => {
    const event = createEvent.pointerOver(target);
    Object.defineProperty(event, "pointerType", { value: pointerType });
    fireEvent(target, event);
  };

  it("brings the row back on a finished tap of the top edge, then puts it away", () => {
    setup();
    fireEvent.click(screen.getByTestId("page-only-peek"));
    expect(peeking()).toBe(true);
    act(() => { vi.advanceTimersByTime(PEEK_MS); });
    expect(peeking()).toBe(false);
  });

  it("does not bring the row back on the press, so the tap can't land on what appears", () => {
    setup();
    fireEvent.pointerDown(screen.getByTestId("page-only-peek"));
    hover(screen.getByTestId("page-only-peek"), "touch");
    expect(peeking()).toBe(false);
  });

  it("answers a mouse resting on the top edge", () => {
    setup();
    hover(screen.getByTestId("page-only-peek"), "mouse");
    expect(peeking()).toBe(true);
  });

  it("keeps it while the row is used and puts it away on a press elsewhere", () => {
    setup();
    fireEvent.click(screen.getByTestId("page-only-peek"));
    act(() => { vi.advanceTimersByTime(PEEK_MS - 500); });
    fireEvent.pointerDown(screen.getByText("inside row"));
    act(() => { vi.advanceTimersByTime(PEEK_MS - 500); });
    expect(peeking()).toBe(true);
    fireEvent.pointerDown(screen.getByText("page text"));
    expect(peeking()).toBe(false);
  });

  it("puts the row away when the mode is switched off", () => {
    const store = setup();
    fireEvent.click(screen.getByTestId("page-only-peek"));
    act(() => { store.set(atom_pageOnly, false); });
    expect(peeking()).toBe(false);
  });
});
