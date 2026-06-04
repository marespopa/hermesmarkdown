"use client";

import React from "react";
import { HiOutlineFolder } from "react-icons/hi";
import Button from "@/app/components/Button";

interface VaultSidebarPendingProps {
  restoreVault: () => void;
}

export default function VaultSidebarPending({ restoreVault }: VaultSidebarPendingProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center animate-in slide-in-from-left duration-700 h-full">
      <HiOutlineFolder size={56} className="opacity-10 mb-6" />
      <h2 className="text-ui-footnote font-medium opacity-60 mb-3">Vault Access Paused</h2>
      <p className="text-ui-footnote opacity-40 mb-8 leading-relaxed px-4">Browser security requires re-authorization to access your local files.</p>
      <Button variant="primary" onClick={restoreVault} className="w-full h-11 rounded-xl">
        Restore Access
      </Button>
    </div>
  );
}
