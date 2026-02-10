import React from "react";

type Props = {
  children: React.ReactNode;
};

export default function EditorTemplate({ children }: Props) {
  return (
    <div className="fixed inset-0 bg-amber-100 dark:bg-darkbg min-h-screen z-0">
      <div className="relative z-10 overflow-auto min-h-screen">
        {children}
      </div>
    </div>
  );
}
