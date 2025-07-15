import { containerStyle } from "@/app/constants/styles";
import Editor from "./Editor";
import { Suspense } from "react";
import LoadingOverlay from "@/app/components/LoadingOverlay";

export default function EditorPage() {
  function SearchBarFallback() {
    return <LoadingOverlay isVisible={true} text="Getting things ready..." />;
  }

  return (
    <div className="fixed inset-0 bg-amber-100 dark:bg-darkbg min-h-screen z-0">
      <div className="relative z-10 overflow-auto min-h-screen">
        <Suspense fallback={<SearchBarFallback />}>
          <Editor />
        </Suspense>
      </div>
    </div>
  );
}
