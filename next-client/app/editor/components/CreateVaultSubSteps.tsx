"use client";

import React from "react";
import Button from "@/app/components/Button";
import { STARTER_PACKS } from "@/app/services/starter-packs";
import { HiOutlineFolder, HiCheck } from "react-icons/hi";
import type { useCreateVault } from "@/app/hooks/file-system/use-create-vault";

type CreateVaultProps = ReturnType<typeof useCreateVault>;

export default function CreateVaultSubSteps(props: CreateVaultProps) {
  const {
    subStep,
    vaultName,
    setVaultName,
    parentFolderName,
    packId,
    setPackId,
    error,
    setError,
    validateName,
    pickParentFolder,
    advanceToPackPicker,
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

  if (subStep === "starter-pack") {
    return (
      <div className="flex flex-col space-y-5 w-full py-4">
        <div className="space-y-1 text-center">
          <h2 className="text-ui-title-3 font-bold">Choose a Starter Pack</h2>
          <p className="text-ui-footnote opacity-60 px-4">
            Pre-populate your vault with example notes, or start blank.
          </p>
        </div>

        <div className="space-y-2 w-full">
          {STARTER_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              onClick={() => setPackId(pack.id)}
              className={`w-full flex items-center gap-3 px-4 h-14 rounded-2xl border transition-all text-left ${
                packId === pack.id
                  ? "border-sage bg-sage/5 dark:bg-sage/10"
                  : "border-edge bg-paper-light dark:bg-paper-dark hover:bg-paper-softgray dark:hover:bg-paper-dark/60"
              }`}
            >
              <span className="text-xl flex-shrink-0">{pack.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-ui-footnote">{pack.label}</div>
                <div className="text-[10px] opacity-50 leading-tight truncate">{pack.description}</div>
              </div>
              {packId === pack.id && (
                <HiCheck className="text-sage flex-shrink-0" size={18} />
              )}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-[11px] text-center px-2">{error}</p>
        )}

        <Button
          variant="primary"
          onClick={createVault}
          className="w-full h-12 rounded-2xl text-ui-footnote font-bold"
        >
          Create Vault
        </Button>
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

        {error && !nameError && (
          <p className="text-amber-500 text-[11px] px-1">{error}</p>
        )}
      </div>

      <Button
        variant="primary"
        disabled={!!nameError || !parentFolderName}
        onClick={advanceToPackPicker}
        className="w-full h-12 rounded-2xl text-ui-footnote font-bold"
      >
        Continue
      </Button>
    </div>
  );
}
