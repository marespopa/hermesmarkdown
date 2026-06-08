"use client";

import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_isDriveVault, atom_drivePathIndex } from "@/app/atoms/drive-atoms";
import * as driveClient from "@/app/services/drive/client";

const AGENT_CONTEXT_PATH = "_agent-context.md";

export function useVaultAgentContext(): string | null {
  const [agentContext, setAgentContext] = useState<string | null>(null);
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const isDriveVault = useAtomValue(atom_isDriveVault);
  const drivePathIndex = useAtomValue(atom_drivePathIndex);

  useEffect(() => {
    setAgentContext(null);

    const load = async () => {
      try {
        if (isDriveVault && drivePathIndex) {
          const entry = drivePathIndex.getEntry(AGENT_CONTEXT_PATH);
          if (!entry) return;
          const text = await driveClient.getFileContent(entry.id);
          setAgentContext(text);
        } else if (vaultHandle) {
          const fileHandle = await vaultHandle.getFileHandle(AGENT_CONTEXT_PATH);
          const file = await fileHandle.getFile();
          const text = await file.text();
          setAgentContext(text);
        }
      } catch {
        // File not present — proceed without context
      }
    };

    load();
  }, [vaultHandle, isDriveVault, drivePathIndex]);

  return agentContext;
}
