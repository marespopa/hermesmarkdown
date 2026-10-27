"use client";

import { useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { atom_webMcpEnabled } from "@/app/atoms/ai-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useNoteTools } from "@/app/editor/components/ai-chat/use-note-tools";
import { getModelContext } from "@/app/services/webmcp-context";

// Browser agents: while Settings → AI Features → Browser agents is on, a
// vault is open and the browser offers WebMCP, the read-only note tools
// (search_notes, read_note, list_open_tasks; private notes never returned)
// are registered with `document.modelContext`, and withdrawn when any of
// that stops. Mounted once by EditorShell, on every /editor route.
export function useWebMcpTools(enabled: boolean) {
  const webMcpEnabled = useAtomValue(atom_webMcpEnabled);
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const { runTool } = useNoteTools();
  // The latest runner, so a new one doesn't re-register the tools.
  const runRef = useRef(runTool);
  useEffect(() => {
    runRef.current = runTool;
  }, [runTool]);

  const active = enabled && webMcpEnabled && !!vaultHandle;
  useEffect(() => {
    const context = active ? getModelContext() : null;
    if (!context) return;
    const controller = new AbortController();
    void import("@/app/services/webmcp").then(({ registerNoteTools }) =>
      registerNoteTools(
        context,
        async (toolName, input) => (await runRef.current({ toolName, input })).output,
        controller.signal,
      ),
    );
    return () => controller.abort();
  }, [active, vaultHandle]);
}
