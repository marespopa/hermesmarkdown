export type SearchableCommand = {
  id: string;
  label: string;
  description?: string;
  keywords?: string | string[];
  category?: string;
};

export type MatchResult = {
  score: number;
  indices: number[];
};

export type FileMatchResult = {
  score: number;
  titleIndices: number[];
  pathIndices: number[];
};

function normalizeKeywords(keywords?: string | string[]) {
  return Array.isArray(keywords) ? keywords.join(" ") : keywords ?? "";
}

function indicesForRange(start: number, length: number) {
  const indices = new Array<number>(length);
  for (let index = 0; index < length; index++) {
    indices[index] = start + index;
  }
  return indices;
}

export function fuzzyMatch(query: string, target: string): MatchResult | null {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedTarget = target.toLowerCase();
  if (!normalizedQuery) return { score: 0, indices: [] };

  const exactIndex = normalizedTarget.indexOf(normalizedQuery);
  if (exactIndex !== -1) {
    const indices = indicesForRange(exactIndex, normalizedQuery.length);
    const startsWord = exactIndex === 0 || /[\s/._-]/.test(normalizedTarget[exactIndex - 1]);
    return {
      score: 1000 - exactIndex * 2 + (exactIndex === 0 ? 300 : 0) + (startsWord ? 150 : 0),
      indices,
    };
  }

  let queryIndex = 0;
  let score = 0;
  let previousIndex = -2;
  const indices: number[] = [];

  for (let targetIndex = 0; targetIndex < normalizedTarget.length && queryIndex < normalizedQuery.length; targetIndex++) {
    if (normalizedTarget[targetIndex] !== normalizedQuery[queryIndex]) continue;
    indices.push(targetIndex);
    score += 10;
    if (targetIndex === previousIndex + 1) score += 12;
    if (targetIndex === 0 || /[\s/._-]/.test(normalizedTarget[targetIndex - 1])) score += 8;
    score -= Math.min(targetIndex, 20) * 0.1;
    previousIndex = targetIndex;
    queryIndex++;
  }

  return queryIndex === normalizedQuery.length ? { score, indices } : null;
}

export function matchCommand(query: string, command: SearchableCommand): MatchResult | null {
  const labelMatch = fuzzyMatch(query, command.label);
  const metadataMatch = fuzzyMatch(
    query,
    [command.description, normalizeKeywords(command.keywords), command.category].filter(Boolean).join(" "),
  );

  if (!labelMatch) return metadataMatch ? { ...metadataMatch, indices: [] } : null;
  if (!metadataMatch) return labelMatch;
  return labelMatch.score >= metadataMatch.score ? labelMatch : { ...metadataMatch, indices: [] };
}

export function matchFile(query: string, file: { name: string; path: string }): FileMatchResult | null {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedName = file.name.toLowerCase();
  const directTitleIndex = normalizedName.indexOf(normalizedQuery);
  if (directTitleIndex !== -1) {
    const directPathIndex = file.path.toLowerCase().indexOf(normalizedQuery);
    const titleIndices = indicesForRange(directTitleIndex, normalizedQuery.length);
    const pathIndices = directPathIndex === -1
      ? []
      : indicesForRange(directPathIndex, normalizedQuery.length);
    return {
      score: 1_300 - directTitleIndex * 2 + (directPathIndex === -1 ? 0 : 80),
      titleIndices,
      pathIndices,
    };
  }

  const titleMatch = fuzzyMatch(query, file.name);
  const pathMatch = fuzzyMatch(query, file.path);
  if (!titleMatch && !pathMatch) return null;

  // Titles are the primary identification surface. A path hit can only win
  // when there is no title hit, so breadcrumbs stay useful without hiding a
  // stronger file-name match.
  if (titleMatch) {
    return {
      score: titleMatch.score + (pathMatch ? Math.min(pathMatch.score, 80) : 0),
      titleIndices: titleMatch.indices,
      pathIndices: pathMatch?.indices ?? [],
    };
  }
  return {
    score: pathMatch!.score * 0.35,
    titleIndices: [],
    pathIndices: pathMatch!.indices,
  };
}
