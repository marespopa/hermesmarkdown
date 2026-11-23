import type { Group, Subsection } from "../doc-primitives";
import { GROUPS } from "./index";

// Every documentation article has its own URL, /documentation/<id>. The hub,
// the article route, the sitemap and llms.txt all read the articles here.

export interface Article {
  item: Subsection;
  group: Group;
  prev: Subsection | null;
  next: Subsection | null;
}

export const articlePath = (id: string) => `/documentation/${id}`;

export function allArticles(): Article[] {
  return GROUPS.flatMap((group) =>
    group.items.map((item, index) => ({
      item,
      group,
      prev: group.items[index - 1] ?? null,
      next: group.items[index + 1] ?? null,
    })),
  );
}

export function findArticle(id: string): Article | undefined {
  return allArticles().find((article) => article.item.id === id);
}
