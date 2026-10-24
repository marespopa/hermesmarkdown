"use client";

import React, { useRef, useState } from "react";
import Button, { SEGMENT_TRACK_CLASS } from "@/app/components/Button";
import { HiOutlineEmojiHappy, HiOutlineFolder } from "react-icons/hi";
import type { useCreateVault } from "@/app/hooks/file-system/use-create-vault";
import { BareInput, FIELD_CLASS } from "@/app/components/Input";
import PinIconPopover from "./PinIconPopover";

export type VaultLocation = "disk" | "browser";

type CreateVaultProps = ReturnType<typeof useCreateVault> & {
  /** Where the vault goes; the choice shows only with `onLocationChange`. */
  location?: VaultLocation;
  onLocationChange?: (location: VaultLocation) => void;
  /** Creates the vault in browser storage, for the "In this browser" choice. */
  onCreateInBrowser?: () => void;
  /** Opens the browser vaults' manager (rename, delete, storage). */
  onManageBrowserVaults?: () => void;
  /** The vault's emoji, picked beside its name; shows the button with `onIconChange`. */
  icon?: string | null;
  onIconChange?: (icon: string | null) => void;
};

// Name the vault (an emoji button beside the name gives it an icon), then
// (on disk) pick the folder it goes in; or, with the location choice set to
// "In this browser", just name it.
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
    location = "disk",
    onLocationChange,
    onCreateInBrowser,
    onManageBrowserVaults,
    icon = null,
    onIconChange,
  } = props;
  const [picker, setPicker] = useState<DOMRect | null>(null);
  const iconRef = useRef<HTMLButtonElement>(null);
  const inBrowser = location === "browser";

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
          {inBrowser
            ? "Notes stay in this browser's private storage, not as files on disk. Export the vault now and then as a backup."
            : "Choose a name and pick where to create the folder."}
        </p>
      </div>

      {onLocationChange && (
        <div className={`grid grid-cols-2 ${SEGMENT_TRACK_CLASS}`} role="tablist" aria-label="Where the vault goes">
          <Button variant="segment" role="tab" aria-selected={!inBrowser} onClick={() => onLocationChange("disk")} className="h-9 rounded-lg">
            Folder on disk
          </Button>
          <Button variant="segment" role="tab" aria-selected={inBrowser} onClick={() => onLocationChange("browser")} className="h-9 rounded-lg">
            In this browser
          </Button>
        </div>
      )}

      <div className="space-y-3 w-full">
        <div>
          <div className="flex items-center gap-2">
            {onIconChange && (
              <Button
                ref={iconRef}
                variant="secondary"
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setPicker((open) => (open ? null : rect));
                }}
                aria-label={icon ? "Change vault icon" : "Add vault icon"}
                title={icon ? "Change icon" : "Add icon"}
                aria-haspopup="dialog"
                aria-expanded={!!picker}
                className="w-11 shrink-0 !px-0 justify-center text-[18px] leading-none"
              >
                {icon ? <span aria-hidden="true">{icon}</span> : <HiOutlineEmojiHappy size={18} aria-hidden="true" />}
              </Button>
            )}
            <BareInput
              type="text"
              value={vaultName}
              onChange={(e) => {
                setVaultName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. my-notes"
              autoFocus
              className={`${FIELD_CLASS} w-full`}
            />
          </div>
          {picker && onIconChange && (
            <PinIconPopover
              anchor={picker}
              current={icon}
              onPick={async (picked) => {
                onIconChange(picked);
                return true;
              }}
              onClose={() => setPicker(null)}
              anchorRef={iconRef}
              label="Vault icon"
              overDialog
            />
          )}
          {nameError && (
            <p className="text-red-500 text-ui-caption mt-1.5 px-1">{nameError}</p>
          )}
        </div>

        {!inBrowser && (
          <>
            <Button variant="unstyled"
              onClick={pickParentFolder}
              className="w-full flex items-center gap-3 px-4 h-12 rounded-xl bg-fill hover:bg-fill-hover active:bg-fill-press transition-colors text-left"
            >
              <HiOutlineFolder className="text-amber-500 flex-shrink-0" size={20} />
              <span className={`text-ui-footnote truncate ${parentFolderName ? "font-medium" : "opacity-50"}`}>
                {parentFolderName ? `Inside: ${parentFolderName}` : "Choose parent folder…"}
              </span>
            </Button>

            <p className="text-ui-caption opacity-40 px-1 leading-relaxed">
              iCloud and Dropbox sync via their own sync client on your computer. If your vault lives in a
              synced folder, HermesMarkdown uses enhanced error recovery to handle files being locked mid-sync.
            </p>
          </>
        )}

        {error && !nameError && (
          <p className="text-amber-500 text-ui-caption px-1">{error}</p>
        )}
      </div>

      <Button
        variant="primary"
        disabled={!!nameError || !vaultName.trim() || (!inBrowser && !parentFolderName)}
        onClick={inBrowser ? onCreateInBrowser : createVault}
        className="w-full h-12 rounded-xl text-ui-footnote font-bold"
      >
        Create Vault
      </Button>
      {inBrowser && onManageBrowserVaults && (
        <Button variant="tertiary" onClick={onManageBrowserVaults} className="self-center">
          Manage browser vaults…
        </Button>
      )}
    </div>
  );
}
