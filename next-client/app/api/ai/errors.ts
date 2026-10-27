// Error text that is safe to show: retry wrappers dropped, keys, tokens and
// email addresses redacted. Shared by the AI routes.
export const sanitizeMessage = (message: string): string => {
  const stripped = message.replace(/^Failed after \d+ attempts?\. Last error:\s*/i, "");
  return stripped.replace(/((?:sk|ghp|github_pat|xox[baprs]-|AIza)[A-Za-z0-9_-]{12,})/g, "[REDACTED]")
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, "$1[REDACTED]")
    .replace(/(api[_-]?key\s*[:=]\s*)([^\s,;]+)/gi, "$1[REDACTED]")
    .replace(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, "[REDACTED_EMAIL]");
};

// The HTTP status for a provider error: overloaded, rate limited, a bad key,
// or anything else.
export const errorStatus = (message: string): number => {
  const lowerMessage = message.toLowerCase();
  return lowerMessage.includes("high demand") || lowerMessage.includes("overloaded") || lowerMessage.includes("529")
    ? 503
    : lowerMessage.includes("rate limit") || lowerMessage.includes("429")
    ? 429
    : lowerMessage.includes("unauthorized") || lowerMessage.includes("authentication") || (lowerMessage.includes("invalid") && (lowerMessage.includes("key") || lowerMessage.includes("api")))
    ? 401
    : 500;
};

// A thrown error's message, or the fallback.
export const errorMessage = (error: unknown, fallback: string): string =>
  (error instanceof Error && error.message) || (typeof error === "string" && error) || fallback;
