"use client";

import React from "react";
import { HiOutlineRefresh } from "react-icons/hi";

interface Props {
  onReconnect: () => void;
}

export default function DriveReconnectBanner({ onReconnect }: Props) {
  return (
    <div className="shrink-0 w-full px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between gap-3">
      <p className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-snug">
        Drive session expired — changes won't save.
      </p>
      <button
        onClick={onReconnect}
        className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 rounded-lg transition-colors"
      >
        <HiOutlineRefresh size={13} />
        Reconnect
      </button>
    </div>
  );
}
