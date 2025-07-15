import { containerStyle } from "@/app/constants/styles";
import Editor from "./Editor";
import { Suspense } from "react";
import LoadingOverlay from "@/app/components/LoadingOverlay";

export default function EditorPage() {
  function SearchBarFallback() {
    return <LoadingOverlay isVisible={true} text="Getting things ready..." />;
  }

  return (
    <div className={`${containerStyle} !px-0 md:px-0`}>
      <Suspense fallback={<SearchBarFallback />}>
        <Editor />
      </Suspense>
    </div>
  );
}
