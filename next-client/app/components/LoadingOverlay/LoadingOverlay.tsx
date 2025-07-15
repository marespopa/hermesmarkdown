'use client';
import React from "react";

interface Props {
  isVisible: boolean;
  text?: string;
}

const LoadingOverlay = ({ isVisible, text = "Loading..." }: Props) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity animate-fade-in">
      <div className="flex flex-col items-center gap-4">
        <span className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 dark:border-gray-700 border-t-amber-500 dark:border-t-amber-400" />
        <span className="text-base text-gray-800 dark:text-gray-200 font-medium drop-shadow-sm">{text}</span>
      </div>
    </div>
  );
};

export default LoadingOverlay;
