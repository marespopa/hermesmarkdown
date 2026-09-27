"use client";

import React from "react";
import { useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { HiOutlineChevronRight, HiOutlineCloudUpload, HiOutlineFolder, HiOutlineFolderAdd } from "react-icons/hi";
import { atom_githubVaultDialogOpen } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import { useFileSystem } from "@/app/hooks/use-file-system";
import type { useCreateVault } from "@/app/hooks/file-system/use-create-vault";
import CreateVaultSubSteps from "../CreateVaultSubSteps";

const optionClass = "flex items-center justify-between px-5 h-14 rounded-2xl border border-edge bg-paper-light dark:bg-paper-dark";

function VaultOption({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <>
      <div className="flex items-center gap-3">
        {icon}
        <div className="text-left">
          <div className="font-bold text-ui-footnote">{title}</div>
          <div className="text-[10px] opacity-50 uppercase tracking-wider font-bold">{hint}</div>
        </div>
      </div>
      <HiOutlineChevronRight opacity={0.3} />
    </>
  );
}

// Step 0: create a new vault, open an existing folder, or connect GitHub.
// While the create flow runs, its sub-steps replace the options.
export default function VaultStep({ createVaultFlow }: { createVaultFlow: ReturnType<typeof useCreateVault> }) {
  const { openVault, isVaultSupported } = useFileSystem();
  const router = useRouter();
  const setGitHubVaultDialogOpen = useSetAtom(atom_githubVaultDialogOpen);

  if (createVaultFlow.subStep) {
    return <CreateVaultSubSteps {...createVaultFlow} />;
  }

  const openExistingVault = async () => {
    if (await openVault()) router.push("/editor/files");
  };

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-4">
      <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
        <HiOutlineFolder size={32} />
      </div>
      <div className="space-y-2">
        <h2 className="text-ui-title-3 font-bold">Connect Your Vault</h2>
        <p className="text-ui-footnote opacity-60 px-4">
          Choose a folder for your notes. HermesMarkdown indexes your
          Markdown files locally so you can search and navigate your
          vault. Your notes stay on your device unless you choose GitHub
          sync.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 w-full">
        <Button variant="secondary" onClick={createVaultFlow.startCreationFlow} disabled={!isVaultSupported} className={optionClass}>
          <VaultOption icon={<HiOutlineFolderAdd className="text-sage" size={24} />} title="Create New Vault" hint="New folder · Empty vault" />
        </Button>
        <Button variant="secondary" onClick={() => void openExistingVault()} disabled={!isVaultSupported} className={optionClass}>
          <VaultOption icon={<HiOutlineFolder className="text-amber-500" size={24} />} title="Open Existing Vault" hint="Offline · No upload" />
        </Button>
        <Button variant="secondary" onClick={() => setGitHubVaultDialogOpen(true)} aria-label="Connect GitHub Vault" className={optionClass}>
          <VaultOption icon={<HiOutlineCloudUpload className="text-sage" size={24} />} title="Connect GitHub Vault" hint="GitHub · Manual sync" />
        </Button>
      </div>
      {!isVaultSupported && (
        <p className="text-[11px] text-red-500 font-medium">
          Local folder access requires Chrome, Edge, or Brave.
        </p>
      )}
    </div>
  );
}
