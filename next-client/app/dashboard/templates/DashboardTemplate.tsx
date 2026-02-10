import React from "react";

type Props = {
  children: React.ReactNode;
};

export default function DashboardTemplate({ children }: Props) {
  return (
    <main className="min-h-screen bg-amber-100 dark:bg-darkbg text-gray-900 dark:text-white">
      <div className="container max-w-screen-lg mx-auto px-6 py-10">
        {children}
      </div>
    </main>
  );
}
