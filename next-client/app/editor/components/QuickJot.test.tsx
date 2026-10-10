import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_quickJot } from "@/app/atoms/ui-atoms";
import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import QuickJot from "./QuickJot";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));

const addJot = vi.fn();
vi.mock("../hooks/use-quick-jot", () => ({ useQuickJot: () => ({ addJot }) }));

const showActionToast = vi.fn();
const showErrorToast = vi.fn();
vi.mock("@/app/components/Toastr", () => ({
  showActionToast: (...args: unknown[]) => showActionToast(...args),
  showErrorToast: (...args: unknown[]) => showErrorToast(...args),
}));

const palette = { isOpen: false, close: vi.fn() };
let registered: Command | null = null;
vi.mock("@/app/components/CommandPalette/CommandPaletteContext", () => ({
  useCommandPalette: () => palette,
  useRegisterCommand: (command: Command | null) => { registered = command; },
}));

const jotKey = () => fireEvent.keyDown(window, { key: "j", code: "KeyJ", ctrlKey: true, altKey: true });

function setup(props: Partial<React.ComponentProps<typeof QuickJot>> = {}) {
  const store = createStore();
  const onOpenSheet = vi.fn();
  render(
    <Provider store={store}>
      <QuickJot onOpenSheet={onOpenSheet} {...props} />
    </Provider>,
  );
  return { store, onOpenSheet };
}

const input = () => screen.findByRole("textbox", { name: "Quick jot" });

describe("QuickJot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    palette.isOpen = false;
    registered = null;
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 10, 9, 0));
  });

  it("registers the palette command, disabled with the reason when there's no vault", () => {
    setup({ disabledReason: "Open a vault first" });
    expect(registered).toMatchObject({ id: "quick-jot", label: "Quick jot", disabledReason: "Open a vault first" });
    expect(registered?.shortcut).toBeTruthy();
  });

  it("shows the reason instead of opening when the shortcut is pressed without a vault", () => {
    setup({ disabledReason: "Open a vault first" });
    jotKey();
    expect(showErrorToast).toHaveBeenCalledWith("Open a vault first");
    expect(screen.queryByRole("textbox", { name: "Quick jot" })).toBeNull();
  });

  it("opens on Ctrl+Alt+J with today's date in the caption", async () => {
    setup();
    act(() => { jotKey(); });
    expect(await input()).toBeTruthy();
    expect(screen.getByText(/Enter adds to 2026-10-10/)).toBeTruthy();
  });

  it("ignores the shortcut while the palette is open", () => {
    palette.isOpen = true;
    setup();
    jotKey();
    expect(screen.queryByRole("textbox", { name: "Quick jot" })).toBeNull();
  });

  it("closes and clears on Escape without adding", async () => {
    const { store } = setup();
    act(() => store.set(atom_quickJot, { open: true, text: "" }));
    fireEvent.change(await input(), { target: { value: "half a thought" } });
    fireEvent.keyDown(await input(), { key: "Escape" });
    expect(store.get(atom_quickJot)).toEqual({ open: false, text: "" });
    expect(addJot).not.toHaveBeenCalled();
  });

  it("adds on Enter, closes, and offers Open in the toast", async () => {
    addJot.mockResolvedValue({ result: "added", sheetName: "2026-10-10" });
    const { store, onOpenSheet } = setup();
    act(() => store.set(atom_quickJot, { open: true, text: "" }));
    fireEvent.change(await input(), { target: { value: "deploy done" } });
    fireEvent.keyDown(await input(), { key: "Enter" });
    expect(store.get(atom_quickJot).open).toBe(false);
    await waitFor(() => expect(showActionToast).toHaveBeenCalledWith("Added to 2026-10-10", "Open", onOpenSheet));
    expect(addJot).toHaveBeenCalledWith("deploy done");
    showActionToast.mock.calls[0][2]();
    expect(onOpenSheet).toHaveBeenCalled();
  });

  it("does nothing on Enter while an IME is composing", async () => {
    const { store } = setup();
    act(() => store.set(atom_quickJot, { open: true, text: "にほ" }));
    fireEvent.keyDown(await input(), { key: "Enter", isComposing: true });
    expect(addJot).not.toHaveBeenCalled();
    expect(store.get(atom_quickJot).open).toBe(true);
  });

  it("closes without adding on an empty Enter", async () => {
    const { store } = setup();
    act(() => store.set(atom_quickJot, { open: true, text: "  " }));
    fireEvent.keyDown(await input(), { key: "Enter" });
    expect(addJot).not.toHaveBeenCalled();
    expect(store.get(atom_quickJot).open).toBe(false);
  });

  it("reopens with the text when the jot is cancelled", async () => {
    addJot.mockResolvedValue({ result: "cancelled" });
    const { store } = setup();
    act(() => store.set(atom_quickJot, { open: true, text: "called the vendor" }));
    fireEvent.keyDown(await input(), { key: "Enter" });
    await waitFor(() => expect(store.get(atom_quickJot)).toEqual({ open: true, text: "called the vendor" }));
  });

  it("doesn't reopen a failed jot that is already in the open buffer", async () => {
    addJot.mockResolvedValue({ result: "failed", keptInBuffer: true });
    const { store } = setup();
    act(() => store.set(atom_quickJot, { open: true, text: "x" }));
    fireEvent.keyDown(await input(), { key: "Enter" });
    await waitFor(() => expect(showErrorToast).toHaveBeenCalledWith("Couldn't add to today's sheet"));
    expect(store.get(atom_quickJot)).toEqual({ open: false, text: "" });
  });

  it("adds from the Add button", async () => {
    addJot.mockResolvedValue({ result: "added", sheetName: "2026-10-10" });
    const { store } = setup();
    act(() => store.set(atom_quickJot, { open: true, text: "tap" }));
    await input();
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(addJot).toHaveBeenCalledWith("tap"));
  });
});
