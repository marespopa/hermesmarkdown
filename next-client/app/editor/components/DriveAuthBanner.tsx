"use client";

import React, { useState } from "react";
import { HiOutlineRefresh } from "react-icons/hi";

interface Props {
  onReconnect: () => void;
}

export default function DriveAuthBanner({ onReconnect }: Props) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleReconnect = () => {
    setIsConnecting(true);
    onReconnect();
  };

  return (
    <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
      <p className="flex-1 text-xs text-amber-700 dark:text-amber-400 font-medium leading-snug">
        Drive session expired — changes won't save.
      </p>
      <button
        onClick={handleReconnect}
        disabled={isConnecting}
        className="shrink-0 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:underline disabled:opacity-60 font-medium"
      >
        <HiOutlineRefresh size={14} className={isConnecting ? "animate-spin" : ""} />
        {isConnecting ? "Connecting…" : "Reconnect"}
      </button>
    </div>
  );
}
