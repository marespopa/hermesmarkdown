// Prompt clarity analysis for LLM-readiness (2026 Standards)
// Shared utility used by both EditorContent and DemoEditor

export interface ClarityResult {
  score: number;
  label: string;
  color: string;
  tips: string[];
}

export function analyzePromptClarity(text: string): ClarityResult {
  const tips: string[] = [];
  let score = 0;

  // 1. Pre-processing & Basic Metrics
  const content = text.replace(/^---[\s\S]*?---\n?/, "").trim();
  const words = content.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount === 0) {
    return {
      score: 0,
      label: "Start writing",
      color: "text-neutral-400",
      tips: ["Enter some text to begin"],
    };
  }

  // 2. Length check (0-15 points)
  if (wordCount >= 50) score += 15;
  else if (wordCount >= 25) score += 12;
  else if (wordCount >= 10) score += 8;
  else {
    score += 4;
    tips.push("Add more details");
  }

  // 3. Action verbs (0-15 points)
  const actionVerbsRegex =
    /\b(explain|describe|investigate|propose|list|generate|write|create|analyze|summarize|compare|identify|provide|outline|define|suggest|recommend|evaluate|review|implement|design|develop|build|fix|improve|refactor|translate|convert|extract|format|rephrase|rewrite|edit|revise|simplify|elaborate|clarify|debug|optimize|validate|verify|check|test|assess|critique|categorize|classify|organize|sort|rank|prioritize|plan|draft|compose|proofread|correct|paraphrase|condense|expand|transform|adapt|modify|calculate|solve|answer|research|find|brainstorm|predict|estimate|demonstrate|illustrate|diagram|structure|guide|instruct|teach|advise|update|apply|change|confirm|execute|run|perform|process|make|set|add|remove|delete|insert|replace|merge|split|copy|move|rename)\b/gi;
  const actionVerbMatches = content.match(actionVerbsRegex) || [];
  if (actionVerbMatches.length > 0) {
    score += 15;
  } else {
    tips.push("Add an action verb (e.g., 'Analyze' or 'Draft')");
  }

  // 4. Persona / Role-playing (0-15 points)
  const personaPattern =
    /\b(act as|you are|you're a|pretend you're|imagine you're|role:|persona:|as a|behave like|take the role|assume the role|speaking as|from the perspective of)\b/i;
  if (personaPattern.test(content)) {
    score += 15;
  } else {
    tips.push("Assign a persona (e.g., 'Act as a senior dev')");
  }

  // 5. Negative constraints (0-10 points)
  const negativeConstraints =
    /\b(do not|don't|never|avoid|skip|omit|exclude|no need to|without|refrain from|don't include|don't mention|no explanations|no preamble|no intro|be concise|be brief|keep it short)\b/i;
  if (negativeConstraints.test(content)) {
    score += 10;
  } else if (wordCount > 20) {
    tips.push("Add negative constraints (what to avoid)");
  }

  // 6. Specificity & Filler words (0-10 points)
  const vagueWords =
    /\b(good|nice|better|best|thing|things|stuff|somehow|something|anything|whatever|etc|maybe|probably|kind of|sort of|really|very|just|actually|basically|literally|simply|quite|pretty much|more or less|in general)\b/gi;
  const vagueMatches = content.match(vagueWords) || [];
  if (vagueMatches.length === 0) {
    score += 10;
  } else {
    tips.push(
      vagueMatches.length === 1
        ? `Remove "${vagueMatches[0]}"`
        : "Remove filler words",
    );
  }

  // 7. Structure & Formatting (0-10 points)
  const hasStructure =
    /(\n[-*]\s|\n\d+\.\s|#{1,3}\s|:\s*\n|```|format:|output:|context:|task:|role:|constraints:)/i.test(
      content,
    );
  if (hasStructure) {
    score += 10;
  } else if (wordCount > 30) {
    tips.push("Use markdown or lists for structure");
  }

  // 8. Output format (0-10 points)
  const hasOutputFormat =
    /\b(json|markdown|list|table|bullet|code|paragraph|steps|summary|plain text|html|xml|csv|yaml|outline|diagram|report)\b/i.test(
      content,
    );
  if (hasOutputFormat) {
    score += 10;
  } else {
    tips.push("Specify a clear output format");
  }

  // 9. Advanced: Context, Variables, Delimiters, Reasoning (Up to 35 potential bonus)
  const hasContext =
    /\b(context|background|assume|given|constraint|requirement|limit|audience|tone|style)\b/i.test(
      content,
    );
  if (hasContext) score += 10;

  const hasVariables =
    /(\{\{[\w\s-]+\}\}|\{[\w\s-]+\}|\[[\w\s-]+\]|<[\w\s-]+>)/.test(content);
  if (hasVariables) score += 5;

  const hasDelimiters =
    /(<(\w+)>[\s\S]*?<\/\2>|\[[\w\s]+\]:?|###\s?[\w\s]+)/i.test(content);
  if (hasDelimiters) score += 10;

  const hasReasoning =
    /\b(step\s?\d+|first|then|finally|think\s?step\s?by\s?step|reasoning|break down)\b/i.test(
      content,
    );
  if (hasReasoning) score += 10;

  // 10. Clamp and Finalize Tips
  score = Math.max(0, Math.min(100, score));

  // ENSURE A TIP ALWAYS EXISTS if score < 90
  if (tips.length === 0 && score < 90) {
    if (!hasReasoning) tips.push("Ask the AI to 'think step-by-step'");
    else if (!hasContext) tips.push("Define the target audience");
    else tips.push("Add specific examples of desired output");
  }

  let finalTips = tips.slice(0, 3);
  if (score >= 90) finalTips = ["Prompt optimized for consistent results"];

  // 11. Tiered Return
  const getTier = (s: number) => {
    if (s >= 90) return { label: "Ready to use", color: "text-emerald-500" };
    if (s >= 75) return { label: "Looking good", color: "text-green-500" };
    if (s >= 60) return { label: "Getting there", color: "text-blue-500" };
    if (s >= 45) return { label: "Almost there", color: "text-amber-500" };
    if (s >= 20) return { label: "Needs work", color: "text-orange-500" };
    return { label: "Just started", color: "text-red-500" };
  };

  const tier = getTier(score);
  return { score, ...tier, tips: finalTips };
}

// Helper to get the dot color class based on clarity label
export function getClarityDotColor(label: string): string {
  switch (label) {
    case "Ready to use":
      return "bg-emerald-500";
    case "Looking good":
      return "bg-green-500";
    case "Getting there":
      return "bg-blue-500";
    case "Almost there":
      return "bg-amber-500";
    case "Needs work":
      return "bg-orange-500";
    case "Just started":
      return "bg-red-500";
    default:
      return "bg-neutral-400";
  }
}

export function getEstimatedTokens(
  promptText: string | null | undefined,
): number {
  if (!promptText) return 0;

  // 1. Handle whitespace/empty cases
  const cleanedText = promptText.trim();
  if (cleanedText.length === 0) return 0;

  // 2. Patterns that typically define token boundaries in BPE
  // - Words (letters and numbers)
  // - Multiple spaces (often collapsed or treated as unique tokens)
  // - Punctuation and special characters
  const tokenMatches = cleanedText.match(/\w+|[^\w\s]|\s+/g);

  if (!tokenMatches) return 0;

  let totalTokens = 0;

  for (const fragment of tokenMatches) {
    const len = fragment.length;

    if (/\s+/.test(fragment)) {
      // Large blocks of whitespace are usually compressed
      totalTokens += Math.ceil(len / 4);
    } else if (/\w+/.test(fragment)) {
      // For alphanumeric words:
      // Short words (<= 4 chars) are usually 1 token.
      // Longer words are broken down (approx 1 token per 3.5 characters).
      totalTokens += len <= 4 ? 1 : Math.ceil(len / 3.5);
    } else {
      // Punctuation and symbols
      // Common symbols are 1 token; rare Unicode may be multiple.
      totalTokens += len <= 1 ? 1 : Math.ceil(len / 2);
    }
  }

  // Safety ceiling: Add a small buffer for potential BOS/EOS overhead
  return Math.ceil(totalTokens);
}
