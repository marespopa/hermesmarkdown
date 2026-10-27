import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_webMcpEnabled, atom_webMcpWritesEnabled } from "@/app/atoms/ai-atoms";
import { atom_fileUndoStack, atom_vaultHandle, type FileUndoGroup } from "@/app/atoms/vault-atoms";
import { useWebMcpTools } from "./use-webmcp-tools";

const runTool = vi.hoisted(() => vi.fn());
vi.mock("@/app/editor/components/ai-chat/use-note-tools", () => ({ useNoteTools: () => ({ runTool }) }));
const getModelContext = vi.hoisted(() => vi.fn());
vi.mock("@/app/services/webmcp-context", () => ({ getModelContext }));
const runCompanionTool = vi.hoisted(() => vi.fn());
const undoTurn = vi.hoisted(() => vi.fn());
vi.mock("@/app/editor/components/companion/use-companion-tools", () => ({ useCompanionTools: () => ({ runTool: runCompanionTool, undoTurn }) }));
const showUndoToast = vi.hoisted(() => vi.fn());
vi.mock("./file-system/undo-toast", () => ({ showUndoToast }));
const registerNoteTools = vi.hoisted(() => vi.fn());
vi.mock("@/app/services/webmcp", () => ({ registerNoteTools }));

const context = { registerTool: vi.fn() };

function setup({ enabled = true, vault = true } = {}) {
  const store = createStore();
  store.set(atom_webMcpEnabled, enabled);
  if (vault) store.set(atom_vaultHandle, { name: "Notes" } as unknown as FileSystemDirectoryHandle);
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const hook = renderHook(({ unlocked }) => useWebMcpTools(unlocked), { wrapper, initialProps: { unlocked: true } });
  return { store, ...hook };
}

describe("useWebMcpTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    getModelContext.mockReturnValue(context);
    registerNoteTools.mockResolvedValue(undefined);
  });

  it("offers the note tools once turned on with a vault open, and runs calls through them", async () => {
    runTool.mockResolvedValue({ output: "No notes match \"pricing\".", activity: "" });
    setup();

    await waitFor(() => expect(registerNoteTools).toHaveBeenCalledTimes(1));
    const [usedContext, run, signal] = registerNoteTools.mock.calls[0];
    expect(usedContext).toBe(context);
    expect(signal.aborted).toBe(false);
    await expect(run("search_notes", { query: "pricing" })).resolves.toBe("No notes match \"pricing\".");
    expect(runTool).toHaveBeenCalledWith({ toolName: "search_notes", input: { query: "pricing" } });
  });

  it("offers nothing while off, without a vault, or where the browser has no WebMCP", async () => {
    setup({ enabled: false });
    setup({ vault: false });
    getModelContext.mockReturnValue(null);
    setup();
    await act(async () => {});
    expect(registerNoteTools).not.toHaveBeenCalled();
  });

  it("withdraws the tools when turned off or the vault locks", async () => {
    const { store, rerender } = setup();
    await waitFor(() => expect(registerNoteTools).toHaveBeenCalledTimes(1));
    const signal = registerNoteTools.mock.calls[0][2] as AbortSignal;

    act(() => store.set(atom_webMcpEnabled, false));
    expect(signal.aborted).toBe(true);

    act(() => store.set(atom_webMcpEnabled, true));
    await waitFor(() => expect(registerNoteTools).toHaveBeenCalledTimes(2));
    rerender({ unlocked: false });
    expect((registerNoteTools.mock.calls[1][2] as AbortSignal).aborted).toBe(true);
  });

  it("offers the write tools only with their own switch on", async () => {
    const { store } = setup();
    await waitFor(() => expect(registerNoteTools).toHaveBeenCalledTimes(1));
    expect(registerNoteTools.mock.calls[0][3]).toEqual({ writes: false });

    act(() => store.set(atom_webMcpWritesEnabled, true));
    await waitFor(() => expect(registerNoteTools).toHaveBeenCalledTimes(2));
    expect(registerNoteTools.mock.calls[1][3]).toEqual({ writes: true });
  });

  it("runs an agent's write as the companion does, in its own undo group, with an Undo toast", async () => {
    const { store } = setup();
    runCompanionTool.mockImplementation(async (_call: unknown, groupId: string) => {
      store.set(atom_fileUndoStack, [{ id: groupId, label: "AI changes", moves: [], steps: [{ kind: "folder", path: "Archive" }] } as unknown as FileUndoGroup]);
      return { output: "Created the folder Archive.", activity: "Created the folder Archive" };
    });
    await waitFor(() => expect(registerNoteTools).toHaveBeenCalledTimes(1));
    const run = registerNoteTools.mock.calls[0][1];

    await expect(run("create_folder", { path: "Archive" })).resolves.toBe("Created the folder Archive.");
    const [call, groupId] = runCompanionTool.mock.calls[0];
    expect(call).toMatchObject({ toolName: "create_folder", input: { path: "Archive" } });
    expect(showUndoToast).toHaveBeenCalledWith("Browser agent: Created the folder Archive", expect.any(Function));
    showUndoToast.mock.calls[0][1]();
    expect(undoTurn).toHaveBeenCalledWith(groupId);
  });
});
