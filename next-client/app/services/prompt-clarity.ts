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
  
  // Remove YAML frontmatter for analysis
  const content = text.replace(/^---[\s\S]*?---\n?/, '').trim();
  const words = content.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  
  // 1. Length check (0-15 points)
  if (wordCount >= 50) score += 15;
  else if (wordCount >= 25) score += 12;
  else if (wordCount >= 10) score += 8;
  else if (wordCount > 0) {
    score += 4;
    tips.push("Add more details");
  }
  
  // 2. Action verbs present (0-15 points)
  const actionVerbsRegex = /\b(explain|describe|investigate|propose|list|generate|write|create|analyze|summarize|compare|identify|provide|outline|define|suggest|recommend|evaluate|review|implement|design|develop|build|fix|improve|refactor|translate|convert|extract|format|rephrase|rewrite|edit|revise|simplify|elaborate|clarify|debug|optimize|validate|verify|check|test|assess|critique|categorize|classify|organize|sort|rank|prioritize|plan|draft|compose|proofread|correct|paraphrase|condense|expand|transform|adapt|modify|calculate|solve|answer|research|find|brainstorm|predict|estimate|demonstrate|illustrate|diagram|structure|guide|instruct|teach|advise|update|apply|change|do it|confirm|execute|run|perform|process|make|set|add|remove|delete|insert|replace|merge|split|copy|move|rename)\b/gi;
  const actionVerbMatches = content.match(actionVerbsRegex) || [];
  const hasActionVerbs = actionVerbMatches.length > 0;
  
  if (hasActionVerbs) {
    score += 15;
  } else if (wordCount > 5) {
    tips.push("Add an action verb");
  }
  
  // 3. Persona / Role-playing bonus (0-15 points)
  // Role-playing is a primary driver for LLM accuracy
  const personaPattern = /\b(act as|you are|you're a|pretend you're|imagine you're|role:|persona:|as a|behave like|take the role|assume the role|speaking as|from the perspective of)\b/i;
  if (personaPattern.test(content)) {
    score += 15;
  } else if (wordCount > 15) {
    tips.push("Assign a role");
  }
  
  // 4. Negative constraints - prevents AI chatter (0-10 points)
  const negativeConstraints = /\b(do not|don't|never|avoid|skip|omit|exclude|no need to|without|refrain from|don't include|don't mention|no explanations|no preamble|no intro|be concise|be brief|keep it short)\b/i;
  if (negativeConstraints.test(content)) {
    score += 10;
  } else if (wordCount > 25) {
    tips.push("Say what to skip");
  }
  
  // 5. Specificity check - penalize vague/filler words (0-10 points)
  // Actively discourages filler words that reduce prompt quality
  const vagueWords = /\b(good|nice|better|best|thing|things|stuff|somehow|something|anything|whatever|etc|maybe|probably|kind of|sort of|really|very|just|actually|basically|literally|simply|really|quite|pretty much|more or less|in general|overall)\b/gi;
  const vagueMatches = content.match(vagueWords) || [];
  if (vagueMatches.length === 0) {
    score += 10;
  } else if (vagueMatches.length <= 1) {
    score += 6;
    tips.push(`Remove "${vagueMatches[0]}"`);
  } else {
    tips.push(`Remove filler words`);
  }
  
  // 6. Structure indicators (0-10 points)
  const hasStructure = /(\n[-*]\s|\n\d+\.\s|#{1,3}\s|:\s*\n|```|format:|output:|context:|task:|role:|constraints:)/i.test(content);
  if (hasStructure) {
    score += 10;
  } else if (wordCount > 30) {
    tips.push("Use lists or headers");
  }
  
  // 7. Output format specified (0-10 points)
  const hasOutputFormat = /\b(json|markdown|list|table|bullet|code|paragraph|steps|summary|plain text|text|html|xml|csv|yaml|numbered|outline|diagram|chart|report|response|answer as|format as|return as|output as|provide as|output contract|format:|output:|respond in|reply with|reply as|response format|in the form of)\b/i.test(content);
  if (hasOutputFormat) {
    score += 10;
  } else if (wordCount > 20) {
    tips.push("Specify output format");
  }
  
  // 8. Context or constraints present (0-10 points)
  const hasContext = /\b(context|background|assume|given|constraint|requirement|must|should|limit|audience|tone|style|scenario|situation)\b/i.test(content);
  if (hasContext) {
    score += 10;
  } else if (wordCount > 20) {
    tips.push("Add context or limits");
  }
  
  // 9. Variable/template awareness (0-5 points)
  // Encourages reusable templates rather than one-off chats
  const variablePattern = /(\{\{[\w\s-]+\}\}|\{[\w\s-]+\}|\[[\w\s-]+\]|<[\w\s-]+>|\$\{[\w\s-]+\}|%[\w]+%)/;
  if (variablePattern.test(content)) {
    score += 5;
  }
  
  // 10. Delimiter Detection (+10 pts) - XML-style tags or clear section delimiters
  const delimiterPattern = /(<(\w+)>[\s\S]*?<\/\2>|\[[\w\s]+\]:?|###\s?[\w\s]+)/i;
  if (delimiterPattern.test(content)) {
    score += 10;
  } else if (wordCount > 40) {
    tips.push("Add section markers");
  }
  
  // 11. Reasoning Bonus (+10 pts) - Chain-of-Thought indicators
  const reasoningPattern = /\b(step\s?\d+|first|then|finally|think\s?step\s?by\s?step|reasoning|let's think|break down|walk through)\b/i;
  if (reasoningPattern.test(content)) {
    score += 10;
  } else if (wordCount > 30) {
    tips.push("Add reasoning steps");
  }
  
  // 12. Instruction Density Check - ratio of action verbs to word count
  if (wordCount > 50) {
    const instructionDensity = actionVerbMatches.length / wordCount;
    if (instructionDensity < 0.05) {
      tips.push("Too wordy, trim it down");
    }
  }
  
  // 13. Structural Penalty - Large prompts without structure
  if (wordCount > 100 && !hasStructure) {
    score -= 10;
    tips.push("Add headers for clarity");
  }
  
  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));
  
  // Determine label and color based on 6-tier scoring system
  if (wordCount === 0) {
    return { score: 0, label: "Start writing", color: "text-neutral-400", tips: [] };
  }
  
  // Limit tips to top 3 most impactful
  let finalTips = tips.slice(0, 3);
  
  // Top tier reward
  if (score >= 90) {
    finalTips = ["Prompt optimized for consistent results"];
  }
  
  if (score >= 90) {
    return { score, label: "Ready to use", color: "text-emerald-500", tips: finalTips };
  } else if (score >= 75) {
    return { score, label: "Looking good", color: "text-green-500", tips: finalTips };
  } else if (score >= 60) {
    return { score, label: "Getting there", color: "text-blue-500", tips: finalTips };
  } else if (score >= 45) {
    return { score, label: "Almost there", color: "text-amber-500", tips: finalTips };
  } else if (score >= 20) {
    return { score, label: "Needs work", color: "text-orange-500", tips: finalTips };
  } else {
    return { score, label: "Just started", color: "text-red-500", tips: finalTips };
  }
}

// Helper to get the dot color class based on clarity label
export function getClarityDotColor(label: string): string {
  switch (label) {
    case 'Ready to use': return 'bg-emerald-500';
    case 'Looking good': return 'bg-green-500';
    case 'Getting there': return 'bg-blue-500';
    case 'Almost there': return 'bg-amber-500';
    case 'Needs work': return 'bg-orange-500';
    case 'Just started': return 'bg-red-500';
    default: return 'bg-neutral-400';
  }
}
