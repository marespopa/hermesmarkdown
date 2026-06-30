"use client";

import React, { useEffect } from "react";
import { useAtom } from "jotai";
import { atom_newVaultFlowOpen } from "@/app/atoms/ui-atoms";
import { useCreateVault } from "@/app/hooks/file-system/use-create-vault";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import CreateVaultSubSteps from "./CreateVaultSubSteps";
import { HiOutlineChevronLeft } from "react-icons/hi";

export default function NewVaultDialog() {
  const [isOpen, setIsOpen] = useAtom(atom_newVaultFlowOpen);
  const vault = useCreateVault();

  useEffect(() => {
    if (isOpen && !vault.subStep) {
      vault.startCreationFlow();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const isVisible = isOpen && !!vault.subStep;

  const handleClose = () => {
    vault.resetFlow();
    setIsOpen(false);
  };

  if (!isVisible) return null;

  const canGoBack = vault.subStep === "name-and-folder" || vault.subStep === "starter-pack";

  return (
    <DialogModal
      isOpened={isVisible}
      onClose={handleClose}
      styles="!max-w-sm"
      mobileSheet
    >
      <div className="relative">
        {canGoBack && (
          <button
            type="button"
            onClick={vault.goBack}
            className="absolute -top-1 left-0 flex items-center gap-1 text-[11px] opacity-50 hover:opacity-100 transition-opacity"
          >
            <HiOutlineChevronLeft size={14} />
            Back
          </button>
        )}
        <CreateVaultSubSteps {...vault} />
      </div>
    </DialogModal>
  );
}
