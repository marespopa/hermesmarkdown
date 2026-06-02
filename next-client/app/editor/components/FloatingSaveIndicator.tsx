"use client";

import React from "react";
import { useAtomValue } from "jotai";
import { atom_saveStatus, atom_isEditorFocused } from "@/app/atoms/atoms";
import { AnimatePresence, motion } from "framer-motion";

export default function FloatingSaveIndicator() {
  const saveStatus = useAtomValue(atom_saveStatus);
  const isEditorFocused = useAtomValue(atom_isEditorFocused);

  return (
    <AnimatePresence>
      {isEditorFocused && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed top-4 right-4 z-[60] md:hidden pointer-events-none"
        >
          <div className="bg-zinc-900/80 dark:bg-zinc-100/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-800 dark:border-zinc-100/20 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="text-[10px] font-mono tracking-widest uppercase">
                {saveStatus.state === "saving" ? (
                  <span className="text-blue-400 animate-pulse font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    Saving
                  </span>
                ) : saveStatus.state === "saved" ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Saved
                  </span>
                ) : (
                  <span className="text-zinc-400">Draft</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
