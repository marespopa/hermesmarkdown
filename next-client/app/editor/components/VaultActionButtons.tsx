"use client";

import React from "react";
import { useSetAtom } from "jotai";
import { HiOutlineCollection, HiOutlineDatabase, HiOutlineGlobeAlt } from "react-icons/hi";
import { atom_browserVaultDialogOpen, atom_newVaultFlowOpen } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import { useFileSystem } from "@/app/hooks/use-file-system";

// Open Vault and Create Vault where disk folder access exists, Browser Vault
// where browser storage (OPFS) exists; renders nothing when neither does.
export default function VaultActionButtons() {
  const { openVault, isVaultSupported, isBrowserVaultSupported } = useFileSystem();
  const setNewVaultFlowOpen = useSetAtom(atom_newVaultFlowOpen);
  const setBrowserVaultDialogOpen = useSetAtom(atom_browserVaultDialogOpen);
  if (!isVaultSupported && !isBrowserVaultSupported) return null;
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {isVaultSupported && (
        <>
          <Button variant="tertiary" onClick={() => openVault()}>
            <HiOutlineDatabase size={16} />
            Open Vault
          </Button>
          <Button variant="tertiary" onClick={() => setNewVaultFlowOpen(true)}>
            <HiOutlineCollection size={16} />
            Create Vault
          </Button>
        </>
      )}
      {isBrowserVaultSupported && (
        <Button variant="tertiary" onClick={() => setBrowserVaultDialogOpen(true)}>
          <HiOutlineGlobeAlt size={16} />
          Browser Vault
        </Button>
      )}
    </div>
  );
}
