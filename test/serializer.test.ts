import { describe, expect, test } from "bun:test";
import { serializeSitemap } from "../src/serializer.ts";

describe("serializeSitemap", () => {
	test("generates valid XML with a single entry", () => {
		const xml = serializeSitemap([{ loc: "https://example.com/" }]);
		expect(xml).toBe(
			`<?xml version="1.0" encoding="UTF-8"?>\n` +
				`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
				`  <url>\n` +
				`    <loc>https://example.com/</loc>\n` +
				`  </url>\n` +
				`</urlset>`,
		);
	});

	test("generates XML with multiple entries", () => {
		const xml = serializeSitemap([
			{ loc: "https://example.com/" },
			{ loc: "https://example.com/about" },
		]);
		expect(xml).toContain("<loc>https://example.com/</loc>");
		expect(xml).toContain("<loc>https://example.com/about</loc>");
	});

	test("includes lastmod when present", () => {
		const xml = serializeSitemap([
			{ loc: "https://example.com/", lastmod: "2025-06-15" },
		]);
		expect(xml).toContain("<lastmod>2025-06-15</lastmod>");
	});

	test("omits lastmod when absent", () => {
		const xml = serializeSitemap([{ loc: "https://example.com/" }]);
		expect(xml).not.toContain("<lastmod>");
	});

	test("includes priority formatted to one decimal", () => {
		const xml = serializeSitemap([
			{ loc: "https://example.com/", priority: 0.8 },
		]);
		expect(xml).toContain("<priority>0.8</priority>");
	});

	test("formats integer priority with decimal", () => {
		const xml = serializeSitemap([
			{ loc: "https://example.com/", priority: 1 },
		]);
		expect(xml).toContain("<priority>1.0</priority>");
	});

	test("omits priority when absent", () => {
		const xml = serializeSitemap([{ loc: "https://example.com/" }]);
		expect(xml).not.toContain("<priority>");
	});

	test("escapes XML special characters in loc", () => {
		const xml = serializeSitemap([{ loc: "https://example.com/a&b<c>d\"e'f" }]);
		expect(xml).toContain(
			"<loc>https://example.com/a&amp;b&lt;c&gt;d&quot;e&apos;f</loc>",
		);
	});

	test("escapes XML special characters in lastmod", () => {
		const xml = serializeSitemap([
			{ loc: "https://example.com/", lastmod: "2025&01" },
		]);
		expect(xml).toContain("<lastmod>2025&amp;01</lastmod>");
	});

	test("generates empty urlset with no entries", () => {
		const xml = serializeSitemap([]);
		expect(xml).toBe(
			`<?xml version="1.0" encoding="UTF-8"?>\n` +
				`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
				`\n` +
				`</urlset>`,
		);
	});

	test("includes changefreq when present", () => {
		const xml = serializeSitemap([
			{ loc: "https://example.com/", changefreq: "weekly" },
		]);
		expect(xml).toContain("<changefreq>weekly</changefreq>");
	});

	test("omits changefreq when absent", () => {
		const xml = serializeSitemap([{ loc: "https://example.com/" }]);
		expect(xml).not.toContain("<changefreq>");
	});

	test("includes image:image when images are present", () => {
		const xml = serializeSitemap([
			{
				loc: "https://example.com/",
				images: [{ loc: "https://example.com/photo.jpg" }],
			},
		]);
		expect(xml).toContain("<image:image>");
		expect(xml).toContain(
			"<image:loc>https://example.com/photo.jpg</image:loc>",
		);
		expect(xml).toContain("</image:image>");
	});

	test("includes image namespace when images are present", () => {
		const xml = serializeSitemap([
			{
				loc: "https://example.com/",
				images: [{ loc: "https://example.com/photo.jpg" }],
			},
		]);
		expect(xml).toContain(
			'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"',
		);
	});

	test("omits image namespace when no images are present", () => {
		const xml = serializeSitemap([{ loc: "https://example.com/" }]);
		expect(xml).not.toContain("xmlns:image");
	});

	test("serializes multiple images per entry", () => {
		const xml = serializeSitemap([
			{
				loc: "https://example.com/",
				images: [
					{ loc: "https://example.com/a.jpg" },
					{ loc: "https://example.com/b.jpg" },
				],
			},
		]);
		expect(xml).toContain(
			"<image:loc>https://example.com/a.jpg</image:loc>",
		);
		expect(xml).toContain(
			"<image:loc>https://example.com/b.jpg</image:loc>",
		);
	});

	test("serializes optional image fields", () => {
		const xml = serializeSitemap([
			{
				loc: "https://example.com/",
				images: [
					{
						loc: "https://example.com/photo.jpg",
						caption: "A nice photo",
						geoLocation: "New York, NY",
						title: "Photo Title",
						license: "https://example.com/license",
					},
				],
			},
		]);
		expect(xml).toContain("<image:caption>A nice photo</image:caption>");
		expect(xml).toContain(
			"<image:geo_location>New York, NY</image:geo_location>",
		);
		expect(xml).toContain("<image:title>Photo Title</image:title>");
		expect(xml).toContain(
			"<image:license>https://example.com/license</image:license>",
		);
	});

	test("omits optional image fields when absent", () => {
		const xml = serializeSitemap([
			{
				loc: "https://example.com/",
				images: [{ loc: "https://example.com/photo.jpg" }],
			},
		]);
		expect(xml).not.toContain("<image:caption>");
		expect(xml).not.toContain("<image:geo_location>");
		expect(xml).not.toContain("<image:title>");
		expect(xml).not.toContain("<image:license>");
	});

	test("escapes XML special characters in image fields", () => {
		const xml = serializeSitemap([
			{
				loc: "https://example.com/",
				images: [
					{
						loc: "https://example.com/a&b.jpg",
						caption: "A <nice> photo",
					},
				],
			},
		]);
		expect(xml).toContain(
			"<image:loc>https://example.com/a&amp;b.jpg</image:loc>",
		);
		expect(xml).toContain(
			"<image:caption>A &lt;nice&gt; photo</image:caption>",
		);
	});

	test("includes all fields when present", () => {
		const xml = serializeSitemap([
			{
				loc: "https://example.com/",
				lastmod: "2025-06-15",
				priority: 1.0,
				changefreq: "daily",
				images: [{ loc: "https://example.com/photo.jpg" }],
			},
		]);
		expect(xml).toContain("<loc>https://example.com/</loc>");
		expect(xml).toContain("<lastmod>2025-06-15</lastmod>");
		expect(xml).toContain("<priority>1.0</priority>");
		expect(xml).toContain("<changefreq>daily</changefreq>");
		expect(xml).toContain(
			"<image:loc>https://example.com/photo.jpg</image:loc>",
		);
	});
});
