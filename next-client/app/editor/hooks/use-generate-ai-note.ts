import { useCallback } from "react";
import toast from "react-hot-toast";
import { useDialog } from "@/app/hooks/use-dialog";
import type { useFileSystem } from "@/app/hooks/use-file-system";
import { generateFileFromPrompt } from "@/app/services/ai";

type FileSystemApi = ReturnType<typeof useFileSystem>;

interface GenerateAiNoteOptions {
  vaultHandle: FileSystemApi["vaultHandle"];
  vaultFiles: FileSystemApi["vaultFiles"];
  chooseTargetDirectory: FileSystemApi["chooseTargetDirectory"];
  createFile: FileSystemApi["createFile"];
}

// "Generate new note with AI": pick a folder, describe the note (optionally
// with reference notes), then save the generated body under frontmatter with
// title, status, scope, tags and read_when.
export function useGenerateAiNote({ vaultHandle, vaultFiles, chooseTargetDirectory, createFile }: GenerateAiNoteOptions) {
  const dialog = useDialog();

  return useCallback(async () => {
    if (!vaultHandle) return;

    const targetDir = await chooseTargetDirectory();
    if (!targetDir) return;

    const result = await dialog.textarea("Describe what you want to write:", "", "Generate Note with AI");
    if (!result?.text?.trim()) return;

    const { text: promptText, referencePaths } = result as { text: string; referencePaths: string[] };

    let fullPrompt = promptText;
    if (referencePaths?.length) {
      const refContents = await Promise.all(
        referencePaths.map(async (refPath) => {
          const handle = vaultFiles.find(
            (f) => (f as any).path === refPath || f.name === refPath
          );
          if (!handle || handle.kind !== "file") return null;
          try {
            const file = await (handle as FileSystemFileHandle).getFile();
            const content = await file.text();
            const name = handle.name.replace(/\.md$/, "");
            return `--- Reference: ${name} ---\n${content}\n--- End Reference ---`;
          } catch {
            return null;
          }
        })
      );
      const joined = refContents.filter(Boolean).join("\n\n");
      if (joined) fullPrompt = `${promptText}\n\n${joined}`;
    }

    const toastId = toast.loading("Generating note...");
    try {
      const { body, title, scope, tags, read_when } = await generateFileFromPrompt(fullPrompt);
      toast.dismiss(toastId);

      const fileName = await dialog.prompt("File name:", title, "Save Note");
      if (!fileName?.trim()) return;

      const tagsStr = (tags ?? []).map((t: string) => t.toLowerCase()).join(", ");
      const readWhenLines = (read_when ?? []).map((r: string) => `  - "${r}"`).join("\n");
      const fm = `---\ntitle: "${title}"\nstatus: draft\nscope: "${scope}"\ntags: [${tagsStr}]\nread_when:\n${readWhenLines}\n---\n\n`;
      await createFile(fileName, fm + body, targetDir);
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || "Failed to generate note");
    }
  }, [vaultHandle, vaultFiles, chooseTargetDirectory, createFile, dialog]);
}
