import { posts } from '$lib/blog/posts';
import type { RequestHandler } from './$types';

const SITE = 'https://humanizeaiwrite.com';

const pages = [
	{ url: '/',         changefreq: 'weekly',  priority: '1.0' },
	{ url: '/detect',   changefreq: 'monthly', priority: '0.9' },
	{ url: '/humanize', changefreq: 'monthly', priority: '0.9' },
	{ url: '/blog',     changefreq: 'weekly',  priority: '0.8' },
	{ url: '/pricing',  changefreq: 'monthly', priority: '0.8' },
	{ url: '/privacy',  changefreq: 'yearly',  priority: '0.3' },
	{ url: '/terms',    changefreq: 'yearly',  priority: '0.3' },
];

export const GET: RequestHandler = () => {
	const now = new Date().toISOString().split('T')[0];

	const staticUrls = pages.map(({ url, changefreq, priority }) => `  <url>
    <loc>${SITE}${url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`);

	const blogUrls = posts.map(({ slug, date }) => `  <url>
    <loc>${SITE}/blog/${slug}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`);

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...blogUrls].join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
};
