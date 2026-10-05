import React from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createStore, Provider } from "jotai";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import EmptyNoteTemplates from "./EmptyNoteTemplates";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const meta = (path: string) => ({ path, name: path.split("/").pop()! }) as FileMetadata;

function renderPills(props: Partial<React.ComponentProps<typeof EmptyNoteTemplates>> = {}, paths: string[] = []) {
  const store = createStore();
  store.set(atom_fileMetadata, Object.fromEntries(paths.map((p) => [p, meta(p)])));
  const onPick = vi.fn();
  const utils = render(
    <Provider store={store}>
      <EmptyNoteTemplates isEmpty onPick={onPick} {...props} />
    </Provider>,
  );
  const rerender = (next: Partial<React.ComponentProps<typeof EmptyNoteTemplates>>) =>
    utils.rerender(
      <Provider store={store}>
        <EmptyNoteTemplates isEmpty onPick={onPick} {...props} {...next} />
      </Provider>,
    );
  return { onPick, rerender };
}

const pillNames = () => screen.getAllByRole("button").map((b) => b.textContent);

describe("EmptyNoteTemplates", () => {
  it("offers the starters when the vault has no templates", () => {
    renderPills();
    expect(pillNames()).toEqual(["Journal", "Meeting notes", "Spec", "Report"]);
  });

  it("offers vault templates, at most four, with More… for the rest", () => {
    const paths = ["a", "b", "c", "d", "e"].map((n) => `templates/${n}.md`);
    const onMore = vi.fn();
    renderPills({ onMore }, paths);
    expect(pillNames()).toEqual(["a", "b", "c", "d", "More…"]);
    fireEvent.click(screen.getByText("More…"));
    expect(onMore).toHaveBeenCalled();
  });

  it("fills the note from the clicked template", () => {
    const { onPick } = renderPills({}, ["templates/standup.md"]);
    fireEvent.click(screen.getByText("standup"));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: "standup", path: "templates/standup.md" }));
  });

  it("fades out, then goes away, once the note has text", () => {
    vi.useFakeTimers();
    const { rerender } = renderPills();
    rerender({ isEmpty: false });
    expect(screen.getByRole("group")).toHaveAttribute("data-state", "closed");
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("renders nothing for a note that isn't empty", () => {
    renderPills({ isEmpty: false });
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });
});
