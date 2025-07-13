import React from "react";

export type SaveState = "none" | "saving" | "saved";

type Props = {
  status: SaveState;
};

export default function SaveStateText({ status }: Props) {
  if (status === "saving") {
    return (
      <span className="inline-block bg-yellow-400 text-black text-xs font-semibold px-3 py-1 rounded mb-2 animate-pulse">
        ⏳ Saving changes...
      </span>
    );
  }

  if (status === "saved") {
    return (
      <span className="inline-block bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded mb-2">
        ✅ Settings saved!
      </span>
    );
  }

  return <></>;
}
