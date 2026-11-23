import { describe, expect, it } from "vitest";
import { GROUPS } from "./index";
import { allArticles, articlePath, findArticle } from "./lookup";

describe("documentation lookup", () => {
  it("lists every article once, with URL-safe unique ids", () => {
    const articles = allArticles();
    const ids = articles.map((article) => article.item.id);
    expect(ids).toHaveLength(GROUPS.reduce((sum, group) => sum + group.items.length, 0));
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("finds an article with its group and neighbours", () => {
    const group = GROUPS.find((g) => g.items.length > 2)!;
    const middle = group.items[1];
    const found = findArticle(middle.id);
    expect(found?.group.id).toBe(group.id);
    expect(found?.prev?.id).toBe(group.items[0].id);
    expect(found?.next?.id).toBe(group.items[2].id);
    expect(findArticle(group.items[0].id)?.prev).toBeNull();
    expect(findArticle(group.items[group.items.length - 1].id)?.next).toBeNull();
  });

  it("returns nothing for an unknown id", () => {
    expect(findArticle("no-such-article")).toBeUndefined();
  });

  it("builds the article path", () => {
    expect(articlePath("vault-overview")).toBe("/documentation/vault-overview");
  });
});
