import type { SitemapEntry, SitemapImage } from "./types.ts";

const IMAGE_XMLNS =
	'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';

/**
 * Serializes an array of SitemapEntry objects into a valid sitemap XML string.
 */
export function serializeSitemap(entries: SitemapEntry[]): string {
	const hasImages = entries.some(
		(e) => e.images !== undefined && e.images.length > 0,
	);
	const urls = entries.map(serializeEntry).join("\n");

	const urlsetAttrs = hasImages
		? `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ${IMAGE_XMLNS}`
		: 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		`<urlset ${urlsetAttrs}>`,
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

	if (entry.images !== undefined) {
		for (const image of entry.images) {
			lines.push(...serializeImage(image));
		}
	}

	lines.push(`  </url>`);
	return lines.join("\n");
}

function serializeImage(image: SitemapImage): string[] {
	const lines = [
		`    <image:image>`,
		`      <image:loc>${escapeXml(image.loc)}</image:loc>`,
	];

	if (image.caption !== undefined) {
		lines.push(
			`      <image:caption>${escapeXml(image.caption)}</image:caption>`,
		);
	}

	if (image.geoLocation !== undefined) {
		lines.push(
			`      <image:geo_location>${escapeXml(image.geoLocation)}</image:geo_location>`,
		);
	}

	if (image.title !== undefined) {
		lines.push(`      <image:title>${escapeXml(image.title)}</image:title>`);
	}

	if (image.license !== undefined) {
		lines.push(
			`      <image:license>${escapeXml(image.license)}</image:license>`,
		);
	}

	lines.push(`    </image:image>`);
	return lines;
}

function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
