"use client";

import React from "react";

type Props = {
  message?: string;
};

export default function Loading({ message = "Loading..." }: Props) {
  return (
    <div className="text-center mt-2 mb-4">
      <div role="status" className="flex gap-2 items-center justify-center text-gray-700 dark:text-gray-200">
        <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-700 dark:border-gray-200" />
        <span className="text-xs dark:text-gray-200">{message}</span>
      </div>
    </div>
  );
}
