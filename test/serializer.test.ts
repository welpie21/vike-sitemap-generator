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

	test("includes all fields when present", () => {
		const xml = serializeSitemap([
			{ loc: "https://example.com/", lastmod: "2025-06-15", priority: 1.0 },
		]);
		expect(xml).toContain("<loc>https://example.com/</loc>");
		expect(xml).toContain("<lastmod>2025-06-15</lastmod>");
		expect(xml).toContain("<priority>1.0</priority>");
	});
});
