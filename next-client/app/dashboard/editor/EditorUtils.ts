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

// Function to replace Markdown headers with HTML headers
function replaceHeaders(input: string): string {
  // Replace headers inside tags (e.g., <div># Heading</div>)
  input = input.replace(/>(#+)\s*(.*?)<\//g, (_, hashes, content) => {
    const level = hashes.length;
    return level >= 1 && level <= 6
      ? `><h${level}>${content}</h${level}></`
      : `>${hashes} ${content}</`;
  });

  // Replace standalone headers (e.g., # Heading)
  return input.replace(
    /(^|\n)(#+)\s*(.*?)(\n|$)/g,
    (_, start, hashes, content, end) => {
      const level = hashes.length;
      return level >= 1 && level <= 6
        ? `${start}<h${level}>${content}</h${level}>${end}`
        : `${start}${hashes} ${content}${end}`;
    }
  );
}

// Function to replace lists with HTML lists
function replaceLists(input: string): string {
  // Replace unordered lists (- or *)
  input = input.replace(
    /(^|\n)(\s*[-*])\s+(.*?)(?=\n|$)/g,
    (_, start, bullet, content) => {
      return `${start}<ul><li>${content}</li></ul>`;
    }
  );

  // Replace ordered lists (e.g., "1.")
  input = input.replace(
    /(^|\n)(\d+\.)\s+(.*?)(?=\n|$)/g,
    (_, start, number, content) => {
      return `${start}<ol><li>${content}</li></ol>`;
    }
  );

  // Merge consecutive <ul> or <ol> tags
  return input.replace(/<\/(ul|ol)>\s*<\1>/g, "");
}

// Function to replace Markdown links with HTML links
function replaceLinks(input: string): string {
  return input.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, text, url) => `<a href="${url}">${text}</a>`
  );
}

// Function to replace Markdown tables with HTML tables
function replaceTables(input: string): string {
  const tableRegex = /((?:\|.*?\|(?:\n|$))+)/g;

  return input.replace(tableRegex, (tableBlock) => {
    const rows = tableBlock.trim().split("\n");
    const headerRow = rows[0];
    const separatorRow = rows[1];

    if (!separatorRow || !/^(\|\s*:?-+:?\s*)+\|$/.test(separatorRow)) {
      return tableBlock; // Not a valid table
    }

    const headers = headerRow
      .split("|")
      .slice(1, -1)
      .map((header) => `<th>${header.trim()}</th>`)
      .join("");

    const bodyRows = rows
      .slice(2)
      .map((row) => {
        const cells = row
          .split("|")
          .slice(1, -1)
          .map((cell) => `<td>${cell.trim()}</td>`)
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    return `<table><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  });
}

// Function to replace inline formatting (bold, italic, strikeout)
function replaceInlineFormatting(input: string): string {
  // Bold (**text** or __text__)
  input = input.replace(
    /(\*\*|__)(.*?)\1/g,
    (_, __, content) => `<strong>${content}</strong>`
  );

  // Italic (*text* or _text_)
  input = input.replace(
    /(\*|_)(.*?)\1/g,
    (_, __, content) => `<em>${content}</em>`
  );

  // Strikeout (~~text~~)
  input = input.replace(/~~(.*?)~~/g, (_, content) => `<del>${content}</del>`);

  return input;
}

// Main function to replace Markdown with HTML
export function replaceMarkdownWithHtml(input: string): string {
  input = replaceHeaders(input);
  input = replaceLists(input);
  input = replaceLinks(input);
  input = replaceTables(input);
  input = replaceInlineFormatting(input);

  return input;
}

export const EMPTY_PAGE_TEMPLATE = ``