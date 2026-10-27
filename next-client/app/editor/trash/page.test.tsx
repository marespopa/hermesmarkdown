import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import TrashPage from "./page";

const fileSystem = vi.hoisted(() => ({
  vaultHandle: { name: "vault" } as unknown,
  scanVault: vi.fn(async () => {}),
  indexVaultTags: vi.fn(async () => {}),
}));
const trash = vi.hoisted(() => ({
  listTrash: vi.fn(),
  restoreFromTrash: vi.fn(async () => "notes/plan.md"),
  deleteTrashSlot: vi.fn(async () => {}),
}));
const confirm = vi.fn(async () => true);

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/editor/trash" }));
vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: () => fileSystem }));
vi.mock("@/app/hooks/use-dialog", () => ({ useDialog: () => ({ confirm }) }));
vi.mock("@/app/hooks/file-system/trash-ops", () => trash);
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const plan = {
  slot: "2026-10-06T09-43-55-123Z-0",
  name: "plan.md",
  kind: "file",
  trashPath: ".hermesmarkdown/trash/2026-10-06T09-43-55-123Z-0/plan.md",
  originalPath: "notes/plan.md",
  deletedAt: new Date("2026-10-06T09:43:55.123Z"),
};

describe("TrashPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fileSystem.vaultHandle = { name: "vault" };
    trash.listTrash.mockResolvedValue([plan]);
  });

  it("lists trashed notes with where they came from", async () => {
    render(<TrashPage />);
    expect(await screen.findByText("plan")).toBeInTheDocument();
    expect(screen.getByText(/from notes$/)).toBeInTheDocument();
  });

  it("puts a note back and rescans the vault", async () => {
    render(<TrashPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Put back plan.md" }));
    await waitFor(() => expect(trash.restoreFromTrash).toHaveBeenCalledWith(fileSystem.vaultHandle, plan));
    expect(fileSystem.scanVault).toHaveBeenCalledWith(fileSystem.vaultHandle);
  });

  it("deletes for good only after asking", async () => {
    confirm.mockResolvedValueOnce(false);
    render(<TrashPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete plan.md permanently" }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(trash.deleteTrashSlot).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Empty Trash" }));
    await waitFor(() => expect(trash.deleteTrashSlot).toHaveBeenCalledWith(fileSystem.vaultHandle, plan.slot));
  });

  it("says when the Trash is empty, and asks for a vault without one", async () => {
    trash.listTrash.mockResolvedValue([]);
    const { unmount } = render(<TrashPage />);
    expect(await screen.findByText("The Trash is empty.")).toBeInTheDocument();
    unmount();

    fileSystem.vaultHandle = null;
    render(<TrashPage />);
    expect(screen.getByText("Open a vault to see its Trash.")).toBeInTheDocument();
  });
});
