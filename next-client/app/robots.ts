import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/editor/', '/api/'],
    },
    sitemap: 'https://hermesmarkdown.com/sitemap.xml',
  }
}
