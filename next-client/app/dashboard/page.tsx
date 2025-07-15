"use client";

import { containerStyle } from "@/app/constants/styles";
import EditorEmpty from "./editor/components/EditorEmpty";

export default function AppPage() {
  return (
    <div className={`${containerStyle} bg-white dark:bg-neutral-900 min-h-screen`}>
      <EditorEmpty />
    </div>
  );
}
