"use client";

import { useEffect, useRef } from "react";
import { useAtomValue, useStore } from "jotai";
import { atom_webMcpEnabled, atom_webMcpWritesEnabled } from "@/app/atoms/ai-atoms";
import { atom_fileUndoStack, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useNoteTools } from "@/app/editor/components/ai-chat/use-note-tools";
import { useCompanionTools } from "@/app/editor/components/companion/use-companion-tools";
import { NOTE_TOOL_DEFS } from "@/app/services/note-tool-defs";
import { getModelContext } from "@/app/services/webmcp-context";
import { showUndoToast } from "./file-system/undo-toast";

let agentCalls = 0;

// Browser agents: while Settings → AI Features → Browser agents is on, a
// vault is open and the browser offers WebMCP, the read-only note tools
// (search_notes, read_note, list_open_tasks; private notes never returned)
// are registered with `document.modelContext`, and withdrawn when any of
// that stops. With "Let browser agents change notes" on too, the AI
// companion's file reads and write tools join them (never the Trash), run as
// the companion runs them: each change is its own group on the app's
// file-undo stack, and a toast offers its Undo. Mounted once by EditorShell,
// on every /editor route.
export function useWebMcpTools(enabled: boolean) {
  const store = useStore();
  const webMcpEnabled = useAtomValue(atom_webMcpEnabled);
  const writesEnabled = useAtomValue(atom_webMcpWritesEnabled);
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const { runTool: runNoteTool } = useNoteTools();
  const { runTool: runCompanionTool, undoTurn } = useCompanionTools();

  // The latest runner, so a new one doesn't re-register the tools.
  const runRef = useRef<(toolName: string, input: Record<string, unknown>) => Promise<string>>(async () => "");
  useEffect(() => {
    runRef.current = async (toolName, input) => {
      if (toolName in NOTE_TOOL_DEFS) return (await runNoteTool({ toolName, input })).output;
      const callId = `webmcp-${Date.now().toString(36)}-${++agentCalls}`;
      const { output, activity } = await runCompanionTool({ toolName, input, toolCallId: callId }, callId);
      if (store.get(atom_fileUndoStack).some((group) => group.id === callId)) {
        showUndoToast(`Browser agent: ${activity}`, () => void undoTurn(callId));
      }
      return output;
    };
  }, [store, runNoteTool, runCompanionTool, undoTurn]);

  const active = enabled && webMcpEnabled && !!vaultHandle;
  const writes = active && writesEnabled;
  useEffect(() => {
    const context = active ? getModelContext() : null;
    if (!context) return;
    const controller = new AbortController();
    void import("@/app/services/webmcp").then(({ registerNoteTools }) =>
      registerNoteTools(context, (toolName, input) => runRef.current(toolName, input), controller.signal, { writes }),
    );
    return () => controller.abort();
  }, [active, writes, vaultHandle]);
}
