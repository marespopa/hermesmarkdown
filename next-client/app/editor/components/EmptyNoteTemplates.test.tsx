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
const fileSystem = vi.hoisted(() => ({ openVault: vi.fn(), isVaultSupported: true, isBrowserVaultSupported: true }));
vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: () => fileSystem }));

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
  it("offers built-in starters and the template packs when the vault has no templates", () => {
    push.mockClear();
    renderPills();
    expect(pillNames()).toEqual(["Meeting notes", "Outline", "Project brief", "Book note", "Browse template packs"]);
    fireEvent.click(screen.getByText("Browse template packs"));
    expect(push).toHaveBeenCalledWith("/editor/templates");
  });

  it("fills the note from a built-in starter, carrying its text", () => {
    const { onPick } = renderPills();
    fireEvent.click(screen.getByText("Outline"));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: "Outline", body: expect.any(String) }));
  });

  it("offers a Board pill that starts a drawing board", () => {
    const onBoard = vi.fn();
    renderPills({ onBoard }, ["_templates/standup.md"]);
    expect(pillNames()).toEqual(["standup", "Board"]);
    fireEvent.click(screen.getByText("Board"));
    expect(onBoard).toHaveBeenCalled();
  });

  it("leads with Open Vault, then only the built-in starters, without a vault", () => {
    fileSystem.openVault.mockClear();
    renderPills({ onBoard: vi.fn() }, [], false);
    expect(pillNames()).toEqual(["Open Vault", "Meeting notes", "Outline", "Project brief", "Book note"]);
    fireEvent.click(screen.getByText("Open Vault"));
    expect(fileSystem.openVault).toHaveBeenCalledOnce();
  });

  it("opens a browser vault from Open Vault without disk folder access", () => {
    fileSystem.isVaultSupported = false;
    fileSystem.openVault.mockClear();
    renderPills({}, [], false);
    fireEvent.click(screen.getByText("Open Vault"));
    expect(fileSystem.openVault).not.toHaveBeenCalled();
    fileSystem.isVaultSupported = true;
  });

  it("offers no Open Vault where the browser can't hold a vault", () => {
    fileSystem.isVaultSupported = false;
    fileSystem.isBrowserVaultSupported = false;
    renderPills({}, [], false);
    expect(screen.queryByText("Open Vault")).not.toBeInTheDocument();
    fileSystem.isVaultSupported = true;
    fileSystem.isBrowserVaultSupported = true;
  });

  it("offers vault templates, at most four, with More… for the rest", () => {
    const paths = ["a", "b", "c", "d", "e"].map((n) => `_templates/${n}.md`);
    const onMore = vi.fn();
    renderPills({ onMore }, paths);
    expect(pillNames()).toEqual(["a", "b", "c", "d", "More…"]);
    fireEvent.click(screen.getByText("More…"));
    expect(onMore).toHaveBeenCalled();
  });

  it("fills the note from the clicked template", () => {
    const { onPick } = renderPills({}, ["_templates/standup.md"]);
    fireEvent.click(screen.getByText("standup"));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: "standup", path: "_templates/standup.md" }));
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
