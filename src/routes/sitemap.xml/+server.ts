import type { RequestHandler } from './$types';

const SITE = 'https://humanizeaiwrite.com';

const pages = [
	{ url: '/',         changefreq: 'weekly',  priority: '1.0' },
	{ url: '/detect',   changefreq: 'monthly', priority: '0.9' },
	{ url: '/humanize', changefreq: 'monthly', priority: '0.9' },
	{ url: '/pricing',  changefreq: 'monthly', priority: '0.8' },
	{ url: '/privacy',  changefreq: 'yearly',  priority: '0.3' },
	{ url: '/terms',    changefreq: 'yearly',  priority: '0.3' },
];

export const GET: RequestHandler = () => {
	const now = new Date().toISOString().split('T')[0];
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(({ url, changefreq, priority }) => `  <url>
    <loc>${SITE}${url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
};
