import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_openFiles, EMPTY_DRAFT } from "@/app/atoms/atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import FolderPrompt from "./FolderPrompt";

vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: vi.fn(),
}));

function renderPrompt(draftText: string, support = { isVaultSupported: true, isBrowserVaultSupported: true }) {
  (useFileSystem as any).mockReturnValue(support);
  const store = createStore();
  store.set(atom_openFiles, (prev) => ({ ...prev, draft: { ...(prev.draft ?? EMPTY_DRAFT), content: draftText } }));
  const onChooseFolder = vi.fn();
  const onDownload = vi.fn();
  render(
    <Provider store={store}>
      <FolderPrompt onChooseFolder={onChooseFolder} onDownload={onDownload} />
    </Provider>,
  );
  return { onChooseFolder, onDownload };
}

describe("FolderPrompt", () => {
  beforeEach(() => vi.clearAllMocks());

  it("asks nothing while the draft is empty", () => {
    renderPrompt("  \n");
    expect(screen.queryByText("Choose where your notes live.")).not.toBeInTheDocument();
    expect(screen.queryByText("Not saved to a folder")).not.toBeInTheDocument();
  });

  it("offers Choose Folder… once the draft has text", () => {
    const { onChooseFolder } = renderPrompt("Trip ideas");
    expect(screen.getByText("Choose where your notes live.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Choose Folder…" }));
    expect(onChooseFolder).toHaveBeenCalledTimes(1);
  });

  it("offers a browser vault where folders can't be opened", () => {
    const { onChooseFolder } = renderPrompt("Trip ideas", { isVaultSupported: false, isBrowserVaultSupported: true });
    fireEvent.click(screen.getByRole("button", { name: "Keep Notes in This Browser" }));
    expect(onChooseFolder).toHaveBeenCalledTimes(1);
  });

  it("offers a download where no vault is possible", () => {
    const { onDownload, onChooseFolder } = renderPrompt("Trip ideas", { isVaultSupported: false, isBrowserVaultSupported: false });
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(onChooseFolder).not.toHaveBeenCalled();
  });

  it("shrinks to a mark on Not Now, and the mark opens it again", () => {
    renderPrompt("Trip ideas");
    fireEvent.click(screen.getByRole("button", { name: "Not Now" }));
    expect(screen.queryByText("Choose where your notes live.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Not saved to a folder" }));
    expect(screen.getByRole("button", { name: "Choose Folder…" })).toBeInTheDocument();
  });
});
