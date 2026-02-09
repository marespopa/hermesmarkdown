/**
 * Utility functions for prompt engineering and analysis
 */

/**
 * Strips YAML frontmatter from markdown content
 * Removes everything between the first --- and the second ---
 * @param content - The full markdown content
 * @returns Clean content without frontmatter
 */
export function stripFrontmatter(content: string): string {
  const frontmatterRegex = /^---[\s\S]*?---\n?/;
  return content.replace(frontmatterRegex, '').trim();
}

/**
 * Counts words in text
 * @param text - The text to count words in
 * @returns Number of words
 */
export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0).length;
}

/**
 * Counts characters in text
 * @param text - The text to count characters in
 * @returns Number of characters
 */
export function countCharacters(text: string): number {
  return text.length;
}

/**
 * Estimates token count using the formula: wordCount * 1.35
 * This is a safe approximation for LLM token count
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  const wordCount = countWords(text);
  return Math.ceil(wordCount * 1.35);
}

/**
 * Calculates reading ease score using a simplified Flesch Reading Ease formula
 * Returns a simple indicator: "Clear", "Complex", or "Technical"
 * @param text - The text to analyze
 * @returns Reading ease indicator
 */
export function calculateReadingEase(text: string): "Clear" | "Complex" | "Technical" {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  if (words.length === 0 || sentences.length === 0) {
    return "Clear";
  }

  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = estimateAverageSyllables(text);
  
  // Simplified Flesch Reading Ease
  const readingEase = 
    206.835 - 
    1.015 * avgWordsPerSentence - 
    84.6 * avgSyllablesPerWord;

  if (readingEase >= 60) {
    return "Clear";
  } else if (readingEase >= 30) {
    return "Complex";
  } else {
    return "Technical";
  }
}

/**
 * Estimates average syllables per word
 * Uses a simple approximation based on vowel count
 * @param text - The text to analyze
 * @returns Average syllables per word
 */
function estimateAverageSyllables(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;

  const totalSyllables = words.reduce((sum, word) => {
    const vowels = word.toLowerCase().match(/[aeiouy]/g);
    const syllableCount = Math.max(1, (vowels?.length || 0));
    return sum + syllableCount;
  }, 0);

  return totalSyllables / words.length;
}

/**
 * Copies text to clipboard and shows a status
 * @param text - The text to copy
 * @returns Promise that resolves when copy is successful
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Gets clean prompt (strips frontmatter) and copies to clipboard
 * @param content - The full markdown content
 * @returns Promise that resolves when copy is successful
 */
export async function copyCleanPrompt(content: string): Promise<boolean> {
  const cleanPrompt = stripFrontmatter(content);
  return copyToClipboard(cleanPrompt);
}

/**
 * Calculates metrics for a given text
 * @param text - The text to analyze
 * @returns Object with word count, character count, token estimate, and reading ease
 */
export function calculateMetrics(text: string) {
  return {
    words: countWords(text),
    characters: countCharacters(text),
    tokens: estimateTokens(text),
    readingEase: calculateReadingEase(text),
  };
}
