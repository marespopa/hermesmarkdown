import { OpenFile } from "@/app/atoms/atoms";
import { v4 as uuidv4 } from "uuid";

/**
 * Utility to create a new OpenFile object from various sources (template, import, new file)
 */
export function createNewOpenFile({
  content = "",
  fileName = "file",
  frontMatter = {},
  isSaved = true,
}: {
  content: string;
  fileName?: string;
  frontMatter?: Record<string, any>;
  isSaved?: boolean;
}): OpenFile {
  return {
    id: uuidv4(),
    content,
    contentEdited: content,
    frontMatter: {
      fileName: fileName || frontMatter.fileName || "file",
      title: frontMatter.title || fileName.replace(/\.[^.]*$/, "") || "File",
      description: frontMatter.description || "",
      tags:
        typeof frontMatter.tags === "string"
          ? frontMatter.tags
          : Array.isArray(frontMatter.tags)
            ? frontMatter.tags.join(",")
            : "",
    },
    isSaved,
  };
}
import matter from "gray-matter";
import { showErrorToast } from "@/app/components/Toastr";

/**
 * Validates if a file is a valid Markdown or text file.
 */
export function isSelectedFileValid(file: File): boolean {
  return !!file && (file.name.endsWith(".md") || file.name.endsWith(".txt"));
}

/**
 * Reads a Markdown file and extracts front matter and content.
 * Returns an object with frontMatter, content, and filename,
 * or undefined if an error occurs.
 */
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
