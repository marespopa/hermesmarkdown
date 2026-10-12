import React from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createStore, Provider } from "jotai";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import EmptyNoteTemplates from "./EmptyNoteTemplates";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const meta = (path: string) => ({ path, name: path.split("/").pop()! }) as FileMetadata;

function renderPills(props: Partial<React.ComponentProps<typeof EmptyNoteTemplates>> = {}, paths: string[] = [], hasVault = true) {
  const store = createStore();
  if (hasVault) store.set(atom_vaultHandle, { kind: "directory", name: "vault" } as unknown as FileSystemDirectoryHandle);
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
  it("offers a link to the template packs when the vault has no templates", () => {
    push.mockClear();
    renderPills();
    expect(pillNames()).toEqual(["Browse template packs"]);
    fireEvent.click(screen.getByText("Browse template packs"));
    expect(push).toHaveBeenCalledWith("/editor/templates");
  });

  it("renders nothing without a vault", () => {
    renderPills({}, [], false);
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
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
