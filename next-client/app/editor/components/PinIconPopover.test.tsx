import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PinIconPopover from "./PinIconPopover";

vi.mock("@/app/editor/codemirror/emoji-index", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/app/editor/codemirror/emoji-index")>();
  const entries = [
    { index: 0, name: "rocket", emoji: "🚀", words: " launch ship" },
    { index: 1, name: "bug", emoji: "🐛", words: " insect" },
    { index: 2, name: "check_mark", emoji: "✔️", words: " done" },
  ];
  return { ...original, loadEmojiIndex: async () => entries };
});

const anchor = { left: 10, bottom: 40, top: 12, right: 200, width: 190, height: 28, x: 10, y: 12 } as DOMRect;

const setup = (current: string | null = null, saved = true) => {
  const onPick = vi.fn(async () => saved);
  const onClose = vi.fn();
  render(<PinIconPopover anchor={anchor} current={current} onPick={onPick} onClose={onClose} />);
  return { onPick, onClose };
};

const tiles = () => within(screen.getByRole("group", { name: "Emoji" })).getAllByRole("button");

describe("PinIconPopover", () => {
  beforeEach(() => cleanup());

  it("filters the grid as you type", async () => {
    setup();
    await waitFor(() => expect(tiles()).toHaveLength(3));
    fireEvent.change(screen.getByRole("textbox", { name: "Search emoji" }), { target: { value: "bu" } });
    expect(tiles().map((tile) => tile.getAttribute("aria-label"))).toEqual(["bug"]);
    fireEvent.change(screen.getByRole("textbox", { name: "Search emoji" }), { target: { value: "zzz" } });
    expect(screen.getByText("No emoji found")).toBeInTheDocument();
  });

  it("picks a tile and closes once saved, and stays open when the save fails", async () => {
    const saved = setup("🚀");
    await waitFor(() => expect(screen.getByRole("button", { name: "rocket" })).toHaveAttribute("aria-pressed", "true"));
    fireEvent.click(screen.getByRole("button", { name: "check mark" }));
    await waitFor(() => expect(saved.onClose).toHaveBeenCalled());
    expect(saved.onPick).toHaveBeenCalledWith("✔️");

    cleanup();
    const failed = setup(null, false);
    fireEvent.click(await screen.findByRole("button", { name: "bug" }));
    await waitFor(() => expect(failed.onPick).toHaveBeenCalledWith("🐛"));
    expect(failed.onClose).not.toHaveBeenCalled();
  });

  it("offers a pasted emoji first, and Enter picks it", async () => {
    const { onPick } = setup();
    await waitFor(() => expect(tiles()).toHaveLength(3));
    const field = screen.getByRole("textbox", { name: "Search emoji" });
    fireEvent.change(field, { target: { value: "🧑‍💻" } });
    expect(tiles()[0]).toHaveTextContent("🧑‍💻");
    fireEvent.keyDown(field, { key: "Enter" });
    await waitFor(() => expect(onPick).toHaveBeenCalledWith("🧑‍💻"));
  });

  it("removes the icon, and can't without one", async () => {
    setup();
    expect(screen.getByRole("button", { name: "Remove Icon" })).toBeDisabled();

    cleanup();
    const { onPick } = setup("🐛");
    fireEvent.click(screen.getByRole("button", { name: "Remove Icon" }));
    await waitFor(() => expect(onPick).toHaveBeenCalledWith(null));
  });

  it("closes on Escape without picking", async () => {
    const { onPick, onClose } = setup();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Search emoji" }), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    expect(onPick).not.toHaveBeenCalled();
  });
});
