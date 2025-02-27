"use client";

import { containerStyle } from "@/app/constants/styles";
import EditorEmpty from "./dashboard/editor/components/EditorEmpty";

export default function AppPage() {
  return (
    <div className={containerStyle}>
      <EditorEmpty />
    </div>
  );
}
