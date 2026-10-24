"use client";

import React, { useEffect, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { atom_browserVaultDialogOpen, atom_newVaultFlowOpen, atom_pendingVaultIcon } from "@/app/atoms/ui-atoms";
import { useCreateVault } from "@/app/hooks/file-system/use-create-vault";
import { useFileSystem } from "@/app/hooks/use-file-system";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import CreateVaultSubSteps, { type VaultLocation } from "./CreateVaultSubSteps";
import { HiOutlineChevronLeft } from "react-icons/hi";
import Button from "@/app/components/Button";

// Create Vault: a folder on disk where the browser can open folders, a
// vault in browser storage where it can't, and a choice of the two where
// both work.
export default function NewVaultDialog() {
  const [isOpen, setIsOpen] = useAtom(atom_newVaultFlowOpen);
  const setBrowserVaultDialogOpen = useSetAtom(atom_browserVaultDialogOpen);
  const vault = useCreateVault();
  const { isVaultSupported, isBrowserVaultSupported, createBrowserVault } = useFileSystem();
  const [location, setLocation] = useState<VaultLocation>("disk");
  const [isCreatingInBrowser, setIsCreatingInBrowser] = useState(false);
  // The emoji picked beside the name; the new vault takes it once it opens.
  const [icon, setIcon] = useState<string | null>(null);
  const setPendingVaultIcon = useSetAtom(atom_pendingVaultIcon);

  useEffect(() => {
    if (!isOpen) return;
    setLocation(isVaultSupported ? "disk" : "browser");
    if (!vault.subStep) {
      setIcon(null);
      vault.startCreationFlow();
    }
  }, [isOpen, isVaultSupported]); // eslint-disable-line react-hooks/exhaustive-deps

  const isVisible = isOpen && !!vault.subStep;

  const handleClose = () => {
    vault.resetFlow();
    setIsOpen(false);
  };

  // Before creating: the tracker matches it to the vault by name.
  const holdIcon = () => setPendingVaultIcon(icon ? { name: vault.vaultName.trim(), icon } : null);

  const createInBrowser = async () => {
    holdIcon();
    setIsCreatingInBrowser(true);
    try {
      if (await createBrowserVault(vault.vaultName.trim())) handleClose();
    } finally {
      setIsCreatingInBrowser(false);
    }
  };

  const manageBrowserVaults = () => {
    handleClose();
    setBrowserVaultDialogOpen(true);
  };

  if (!isVisible) return null;

  const canGoBack = vault.subStep === "name-and-folder" && !isCreatingInBrowser;

  return (
    <DialogModal
      isOpened={isVisible}
      onClose={handleClose}
      styles="!max-w-sm"
      mobileSheet
    >
      <div className="relative">
        {canGoBack && (
          <Button variant="unstyled"
            onClick={vault.goBack}
            className="absolute -top-1 left-0 flex items-center gap-1 text-ui-caption opacity-50 hover:opacity-100 transition-opacity"
          >
            <HiOutlineChevronLeft size={14} />
            Back
          </Button>
        )}
        <CreateVaultSubSteps
          {...vault}
          subStep={isCreatingInBrowser ? "installing" : vault.subStep}
          location={location}
          onLocationChange={isVaultSupported && isBrowserVaultSupported ? setLocation : undefined}
          onCreateInBrowser={() => void createInBrowser()}
          onManageBrowserVaults={manageBrowserVaults}
          createVault={() => {
            holdIcon();
            return vault.createVault();
          }}
          icon={icon}
          onIconChange={setIcon}
        />
      </div>
    </DialogModal>
  );
}
