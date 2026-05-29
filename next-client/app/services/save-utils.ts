import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";

export type StatusResponse = {
  status: "error" | "success";
  message: string;
};

export const saveFile = ({
  blob,
  fileName,
}: {
  blob: Blob;
  fileName: string;
}) => {
  if ("showSaveFilePicker" in window) {
    return exportNativeFileSystem({ blob, fileName })
      .then(() => {
        showSuccessToast("File has been saved.");
      })
      .catch((err) => {
        if (err?.name === "AbortError") {
          // Note: We don't have a neutral toast function, so we'll skip this notification
          return;
        }
        showErrorToast("The file could not be saved");
      });
  }

  showSuccessToast("File has been saved.");
  return download({ blob, fileName });
};

const exportNativeFileSystem = async ({
  blob,
  fileName,
}: {
  blob: Blob;
  fileName: string;
}) => {
  const fileHandle: FileSystemFileHandle = await getNewFileHandle({ fileName });

  if (!fileHandle) {
    throw new Error("Cannot access filesystem");
  }

  await writeFile({ fileHandle, blob });
};

const getNewFileHandle = ({
  fileName,
}: {
  fileName: string;
}): Promise<FileSystemFileHandle> => {
  const opts: SaveFilePickerOptions = {
    suggestedName: fileName,
    types: [
      {
        description: "Markdown file",
        accept: {
          "text/plain": [".md"],
        },
      },
    ],
  };

  return showSaveFilePicker(opts);
};

const writeFile = async ({
  fileHandle,
  blob,
}: {
  fileHandle: FileSystemFileHandle;
  blob: Blob;
}) => {
  let writer: FileSystemWritableFileStream | null = null;
  try {
    writer = await fileHandle.createWritable();
    if (writer) {
      await writer.write(blob);
      await writer.close();
      writer = null;
    }
  } finally {
    if (writer) {
      try {
        await (writer as any).close();
      } catch {
        // Ignore cleanup error
      }
    }
  }
};

const download = ({ fileName, blob }: { fileName: string; blob: Blob }) => {
  const a: HTMLAnchorElement = document.createElement("a");
  a.style.display = "none";
  document.body.appendChild(a);

  const url: string = window.URL.createObjectURL(blob);

  a.href = url;
  a.download = fileName.endsWith('.md') ? fileName : `${fileName}.md`;

  a.click();

  window.URL.revokeObjectURL(url);
  a.parentElement?.removeChild(a);
};
