import { MetadataRoute } from "next";
import { ALTERNATIVES, alternativePath } from "./alternatives/content";
import { GUIDES, guidePath } from "./guides/content";
import { allArticles, articlePath } from "./documentation/content/lookup";
import { TOOLS, toolPath } from "./tools/content/tools";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://hermesmarkdown.com";
  const currentDate = new Date().toISOString().split("T")[0];

  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/markdown-editor`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/documentation`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/what-is-hermes-md`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tools`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // One entry per free tool, from the catalog.
    ...TOOLS.map((tool) => ({
      url: `${baseUrl}${toolPath(tool)}`,
      lastModified: currentDate,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    // The comparison and how-to pages: each hub, then every entry.
    ...[
      { path: "/alternatives", priority: 0.7 },
      ...ALTERNATIVES.map((entry) => ({ path: alternativePath(entry), priority: 0.7 })),
      { path: "/guides", priority: 0.7 },
      ...GUIDES.map((entry) => ({ path: guidePath(entry), priority: 0.7 })),
    ].map(({ path, priority }) => ({
      url: `${baseUrl}${path}`,
      lastModified: currentDate,
      changeFrequency: "monthly" as const,
      priority,
    })),
    // One entry per documentation article.
    ...allArticles().map(({ item }) => ({
      url: `${baseUrl}${articlePath(item.id)}`,
      lastModified: currentDate,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
