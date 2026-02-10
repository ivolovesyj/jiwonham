import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/', '/onboarding', '/profile'],
      },
    ],
    sitemap: 'https://jiwonham.vercel.app/sitemap.xml',
  }
}
