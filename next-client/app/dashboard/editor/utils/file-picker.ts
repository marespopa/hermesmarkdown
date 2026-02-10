import matter from "gray-matter";
import { showErrorToast } from "@/app/components/Toastr";

// Utility function to validate selected file
export function isSelectedFileValid(file: File): boolean {
  return !!file && (file.name.endsWith(".md") || file.name.endsWith(".txt"));
}

// Function to extract front matter and content from a Markdown file
export async function getFileDataFromInput(file: File) {
  try {
    if (!file) {
      showErrorToast("File could not be loaded");
      return;
    }
    const text = await file.text();
    const { data: frontMatter, content } = matter(text);

    return {
      frontMatter,
      content,
      filename: file.name,
    };
  } catch (error) {
    console.error("Error reading file:", error);
  }
}

export const PICKER_OPTIONS: OpenFilePickerOptions = {
  types: [
    {
      description: "MD Files",
      accept: {
        "text/markdown": [".md", ".txt"],
      },
    },
  ],
  excludeAcceptAllOption: true,
  multiple: false,
};
