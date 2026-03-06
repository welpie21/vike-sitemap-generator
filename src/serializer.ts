import type { SitemapEntry } from "./types.ts";

/**
 * Serializes an array of SitemapEntry objects into a valid sitemap XML string.
 */
export function serializeSitemap(entries: SitemapEntry[]): string {
	const urls = entries.map(serializeEntry).join("\n");

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		urls,
		"</urlset>",
	].join("\n");
}

function serializeEntry(entry: SitemapEntry): string {
	const lines = [`  <url>`, `    <loc>${escapeXml(entry.loc)}</loc>`];

	if (entry.lastmod !== undefined) {
		lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
	}

	if (entry.priority !== undefined) {
		lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
	}

	if (entry.changefreq !== undefined) {
		lines.push(`    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`);
	}

	lines.push(`  </url>`);
	return lines.join("\n");
}

function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
