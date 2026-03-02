// prompt-clarity.ts

export interface ClarityResult {
  score: number;
  label: string;
  nextStep: string;
  tips: string[];
}

/**
 * High-performance token estimator (BPE-lite)
 */
export function getEstimatedTokens(text: string | null | undefined): number {
  if (!text) return 0;
  const cleanedText = text.trim();
  if (cleanedText.length === 0) return 0;

  const tokenMatches = cleanedText.match(/\w+|[^\w\s]|\s+/g);
  if (!tokenMatches) return Math.ceil(cleanedText.length / 4);

  let totalTokens = 0;
  for (const fragment of tokenMatches) {
    const len = fragment.length;
    if (/\s+/.test(fragment)) totalTokens += Math.ceil(len / 4);
    else if (/\w+/.test(fragment))
      totalTokens += len <= 4 ? 1 : Math.ceil(len / 3.5);
    else totalTokens += 1;
  }
  return Math.ceil(totalTokens);
}

/**
 * Analyzes prompt structure based on 2026 Agentic Pillars.
 * Prioritizes XML scoping and placeholder removal.
 */
export function analyzePromptClarity(text: string): ClarityResult {
  const content = text.trim();
  const tips: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  if (content.length === 0) {
    return {
      score: 0,
      label: "Empty",
      nextStep: "Try: 'Act as a [Role]...'",
      tips: ["Assign a Role", "Define the Task", "Use XML Containers"],
    };
  }

  // 1. Placeholder Detection (Checks for remaining {variable} markers)
  const placeholderRegex = /\{[a-zA-Z0-9_| ]+\}/g;
  const hasPlaceholders = placeholderRegex.test(content);

  // 2. Structural Pillars (Requirements)
  // We check for STRICT XML containers for 100% score
  const pillars = [
    {
      id: "role",
      strict: /<role>[\s\S]*?<\/role>/i,
      msg: "Upgrade to <role> tag",
      suggestion: "Wrap role in <role>...</role>",
    },
    {
      id: "task",
      strict: /<task>[\s\S]*?<\/task>/i,
      msg: "Scoped <task> needed",
      suggestion: "Use: '<task> Do [X]... </task>'",
    },
    {
      id: "format",
      strict: /format|json|markdown|table|bullet/i,
      msg: "Specify Output Format",
      suggestion: "Try: 'Output as [JSON/Table]'",
    },
    {
      id: "xml",
      strict: /<(\w+)>.*?<\/\1>/s,
      msg: "Use <tags> for context",
      suggestion: "Wrap data in <context>...</context>",
    },
  ];

  pillars.forEach((p) => {
    if (p.strict.test(content)) {
      score += 25;
    } else {
      tips.push(p.msg);
      suggestions.push(p.suggestion);
    }
  });

  // 3. Penalty for remaining placeholders
  if (hasPlaceholders) {
    score = Math.min(score, 80); // Cannot be "Ready" if still a template
    suggestions.unshift("Replace placeholders (e.g. {role})");
  }

  // 4. Token Optimization (Fluff removal)
  const fluffRegex =
    /\b(please|basically|actually|i would like to|can you)\b/gi;
  const fluffMatches = content.match(fluffRegex) || [];

  if (fluffMatches.length > 0) {
    if (score === 100) score = 95;
    const fluffTip = `Remove "${fluffMatches[0]}" to save tokens`;
    tips.push(fluffTip);
    suggestions.push(fluffTip);
  }

  // Final Step mapping
  const nextStep =
    suggestions.length > 0 ? suggestions[0] : "Prompt is optimized";

  // Labeling logic
  let label = "Drafting";
  if (score >= 100) label = "Ready";
  else if (hasPlaceholders) label = "Template";
  else if (score >= 75) label = "Polishing";

  return { score, label, nextStep, tips };
}
