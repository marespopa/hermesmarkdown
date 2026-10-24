"use client";

import React from "react";
import { useSetAtom } from "jotai";
import { HiOutlineCollection, HiOutlineDatabase } from "react-icons/hi";
import { atom_newVaultFlowOpen } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import { useFileSystem } from "@/app/hooks/use-file-system";

// Open Vault and Create Vault wherever a vault can be kept, on disk or in
// browser storage (OPFS): Create Vault asks which where both work, and Open
// Vault lists the browser vaults where folders can't be opened. Renders
// nothing when neither works.
export default function VaultActionButtons() {
  const { openVault, isVaultSupported, isBrowserVaultSupported } = useFileSystem();
  const setNewVaultFlowOpen = useSetAtom(atom_newVaultFlowOpen);
  if (!isVaultSupported && !isBrowserVaultSupported) return null;
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button variant="tertiary" onClick={() => openVault()}>
        <HiOutlineDatabase size={16} />
        Open Vault
      </Button>
      <Button variant="tertiary" onClick={() => setNewVaultFlowOpen(true)}>
        <HiOutlineCollection size={16} />
        Create Vault
      </Button>
    </div>
  );
}
