import { Suspense } from "react";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import EditorTemplate from "../templates/EditorTemplate";
import Editor from "../organisms/Editor";

export default function EditorPage() {
  function SearchBarFallback() {
    return <LoadingOverlay isVisible={true} text="Getting things ready..." />;
  }

  return (
    <EditorTemplate>
      <Suspense fallback={<SearchBarFallback />}>
        <Editor />
      </Suspense>
    </EditorTemplate>
  );
}
