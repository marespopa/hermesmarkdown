"use client";

import React from "react";
import Button from "@/app/components/Button";
import { HiOutlineFolder } from "react-icons/hi";
import type { useCreateVault } from "@/app/hooks/file-system/use-create-vault";

type CreateVaultProps = ReturnType<typeof useCreateVault>;

export default function CreateVaultSubSteps(props: CreateVaultProps) {
  const {
    subStep,
    vaultName,
    setVaultName,
    parentFolderName,
    error,
    setError,
    validateName,
    pickParentFolder,
    createVault,
  } = props;

  if (subStep === "installing") {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <div className="w-10 h-10 border-2 border-sage border-t-transparent rounded-full animate-spin" />
        <p className="text-ui-footnote opacity-60">Creating vault…</p>
      </div>
    );
  }

  // subStep === "name-and-folder"
  const nameError = vaultName ? validateName(vaultName) : null;

  return (
    <div className="flex flex-col space-y-5 w-full py-4">
      <div className="space-y-1 text-center">
        <h2 className="text-ui-title-3 font-bold">Name Your Vault</h2>
        <p className="text-ui-footnote opacity-60 px-4">
          Choose a name and pick where to create the folder.
        </p>
      </div>

      <div className="space-y-3 w-full">
        <div>
          <input
            type="text"
            value={vaultName}
            onChange={(e) => {
              setVaultName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. my-notes"
            autoFocus
            className="w-full h-12 rounded-2xl border border-edge bg-paper-light dark:bg-paper-dark px-4 text-ui-footnote font-medium focus:outline-none focus:border-sage transition-colors"
          />
          {nameError && (
            <p className="text-red-500 text-[11px] mt-1.5 px-1">{nameError}</p>
          )}
        </div>

        <button
          type="button"
          onClick={pickParentFolder}
          className="w-full flex items-center gap-3 px-4 h-12 rounded-2xl border border-edge bg-paper-light dark:bg-paper-dark hover:bg-paper-softgray dark:hover:bg-paper-dark/60 transition-colors text-left"
        >
          <HiOutlineFolder className="text-amber-500 flex-shrink-0" size={20} />
          <span className={`text-ui-footnote truncate ${parentFolderName ? "font-medium" : "opacity-50"}`}>
            {parentFolderName ? `Inside: ${parentFolderName}` : "Choose parent folder…"}
          </span>
        </button>

        <p className="text-[10px] opacity-40 px-1 leading-relaxed">
          iCloud and Dropbox sync via their own sync client on your computer. If your vault lives in a
          synced folder, HermesMarkdown uses enhanced error recovery to handle files being locked mid-sync.
        </p>

        {error && !nameError && (
          <p className="text-amber-500 text-[11px] px-1">{error}</p>
        )}
      </div>

      <Button
        variant="primary"
        disabled={!!nameError || !parentFolderName}
        onClick={createVault}
        className="w-full h-12 rounded-2xl text-ui-footnote font-bold"
      >
        Create Vault
      </Button>
    </div>
  );
}
