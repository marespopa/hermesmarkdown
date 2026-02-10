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
