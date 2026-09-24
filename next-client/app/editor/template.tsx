import type { ReactNode } from "react";

export default function EditorTemplate({ children }: { children: ReactNode }) {
  return (
    <div className="editor-route-transition">
      {children}
    </div>
  );
}
