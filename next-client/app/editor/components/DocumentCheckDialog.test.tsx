import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import DocumentCheckDialog from "./DocumentCheckDialog";
import { atom_activeFilePath } from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_activeEditorView, atom_documentCheckOpen } from "@/app/atoms/ui-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";

vi.mock("jotai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jotai")>();
  return { ...actual, useAtom: vi.fn(), useAtomValue: vi.fn() };
});

import { useAtom, useAtomValue } from "jotai";

type Edit = { from: number; to: number; insert: string };

function fakeView(initial: string) {
  let text = initial;
  return {
    get text() { return text; },
    state: {
      doc: {
        toString: () => text,
        get lines() { return text.split("\n").length; },
        line: (n: number) => ({ from: text.split("\n").slice(0, n - 1).join("\n").length + (n > 1 ? 1 : 0) }),
      },
    },
    dispatch: vi.fn(({ changes }: { changes?: Edit[] }) => {
      // As the editor applies them: every range is in the text before any edit.
      for (const { from, to, insert } of [...(changes ?? [])].sort((a, b) => b.from - a.from)) {
        text = text.slice(0, from) + insert + text.slice(to);
      }
    }),
    focus: vi.fn(),
  };
}

const NOTE = "# Title\n\n### Deep\n\nSee [[Nowhere]] now.\n";

function setup(view = fakeView(NOTE), open = true) {
  const setOpen = vi.fn();
  const values = new Map<unknown, unknown>([
    [atom_activeEditorView, view],
    [atom_activeFilePath, "notes/today.md"],
    [atom_fileMetadata, {}],
    [atom_vaultHandle, null],
  ]);
  vi.mocked(useAtomValue).mockImplementation(((atom: unknown) => values.get(atom)) as never);
  vi.mocked(useAtom).mockImplementation(((atom: unknown) =>
    atom === atom_documentCheckOpen ? [open, setOpen] : [values.get(atom), vi.fn()]) as never);
  render(<DocumentCheckDialog />);
  return { view, setOpen };
}

describe("DocumentCheckDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders nothing while closed", () => {
    setup(fakeView(NOTE), false);
    expect(screen.queryByText("Check document")).not.toBeInTheDocument();
  });

  it("lists the problems with a fix for each", async () => {
    setup();
    expect(await screen.findByText("2 problems found.")).toBeInTheDocument();
    expect(screen.getByText(/This H3 follows an H1/)).toBeInTheDocument();
    expect(screen.getByText(/\[\[Nowhere\]\] doesn't match any note/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Make it H2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unlink" })).toBeInTheDocument();
  });

  it("applies one fix as a single edit, then checks again", async () => {
    const { view } = setup();
    fireEvent.click(await screen.findByRole("button", { name: "Make it H2" }));
    expect(view.dispatch).toHaveBeenCalledWith(expect.objectContaining({
      changes: [{ from: NOTE.indexOf("###"), to: NOTE.indexOf("###") + 3, insert: "##" }],
    }));
    expect(await screen.findByText("1 problem found.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Make it H2" })).not.toBeInTheDocument();
  });

  it("fixes everything at once", async () => {
    const { view } = setup();
    fireEvent.click(await screen.findByRole("button", { name: "Fix all 2" }));
    expect(view.dispatch).toHaveBeenCalledTimes(1);
    expect(view.text).toBe("# Title\n\n## Deep\n\nSee Nowhere now.\n");
    expect(await screen.findByText("No problems found.")).toBeInTheDocument();
  });

  it("checks again instead of editing when the note changed since the check", async () => {
    const { view } = setup();
    const fix = await screen.findByRole("button", { name: "Make it H2" });
    view.dispatch({ changes: [{ from: 0, to: 0, insert: "Added line\n" }] });
    view.dispatch.mockClear();
    fireEvent.click(fix);
    expect(view.dispatch).not.toHaveBeenCalled();
    // The list now describes the note as it is: the heading moved down a line.
    expect(await screen.findByRole("button", { name: "Go to line 4" })).toBeInTheDocument();
    expect(screen.getByText("2 problems found.")).toBeInTheDocument();
  });

  it("jumps to the line and closes", async () => {
    const { view, setOpen } = setup();
    fireEvent.click((await screen.findAllByRole("button", { name: /Go to line/ }))[0]);
    expect(setOpen).toHaveBeenCalledWith(false);
    expect(view.dispatch).toHaveBeenCalledWith(expect.objectContaining({ scrollIntoView: true }));
    expect(view.focus).toHaveBeenCalled();
  });

  it("says so when everything is fine", async () => {
    setup(fakeView("# Title\n\n## Part\n\ntext\n"));
    expect(await screen.findByText("No problems found.")).toBeInTheDocument();
  });
});
