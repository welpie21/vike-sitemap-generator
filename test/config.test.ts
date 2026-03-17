import { describe, expect, test } from "bun:test";
import { resolveConfig } from "../src/resolveConfig.ts";

describe("resolveConfig", () => {
	test("strips trailing slashes from baseUrl", () => {
		const config = resolveConfig({ baseUrl: "https://example.com/" });
		expect(config.baseUrl).toBe("https://example.com");
	});

	test("strips multiple trailing slashes from baseUrl", () => {
		const config = resolveConfig({ baseUrl: "https://example.com///" });
		expect(config.baseUrl).toBe("https://example.com");
	});

	test("leaves baseUrl without trailing slash unchanged", () => {
		const config = resolveConfig({ baseUrl: "https://example.com" });
		expect(config.baseUrl).toBe("https://example.com");
	});

	test("defaults outFile to sitemap.xml", () => {
		const config = resolveConfig({ baseUrl: "https://example.com" });
		expect(config.outFile).toBe("sitemap.xml");
	});

	test("uses custom outFile when provided", () => {
		const config = resolveConfig({
			baseUrl: "https://example.com",
			outFile: "custom.xml",
		});
		expect(config.outFile).toBe("custom.xml");
	});

	test("defaults outDir to undefined", () => {
		const config = resolveConfig({ baseUrl: "https://example.com" });
		expect(config.outDir).toBeUndefined();
	});

	test("passes through outDir when provided", () => {
		const config = resolveConfig({
			baseUrl: "https://example.com",
			outDir: "dist/public",
		});
		expect(config.outDir).toBe("dist/public");
	});

	test("defaults additionalUrls to empty array", () => {
		const config = resolveConfig({ baseUrl: "https://example.com" });
		expect(config.additionalUrls).toEqual([]);
	});

	test("passes through additionalUrls", () => {
		const urls = ["/a", "/b"];
		const config = resolveConfig({
			baseUrl: "https://example.com",
			additionalUrls: urls,
		});
		expect(config.additionalUrls).toEqual(urls);
	});

	test("defaults concurrency to 10", () => {
		const config = resolveConfig({ baseUrl: "https://example.com" });
		expect(config.concurrency).toBe(10);
	});

	test("uses custom concurrency when provided", () => {
		const config = resolveConfig({
			baseUrl: "https://example.com",
			concurrency: 50,
		});
		expect(config.concurrency).toBe(50);
	});

	test("defaults maxUrlsPerSitemap to 50000", () => {
		const config = resolveConfig({ baseUrl: "https://example.com" });
		expect(config.maxUrlsPerSitemap).toBe(50_000);
	});

	test("uses custom maxUrlsPerSitemap when provided", () => {
		const config = resolveConfig({
			baseUrl: "https://example.com",
			maxUrlsPerSitemap: 10_000,
		});
		expect(config.maxUrlsPerSitemap).toBe(10_000);
	});

	test("defaults robots to false", () => {
		const config = resolveConfig({ baseUrl: "https://example.com" });
		expect(config.robots).toBe(false);
	});

	test("uses custom robots when provided", () => {
		const config = resolveConfig({
			baseUrl: "https://example.com",
			robots: true,
		});
		expect(config.robots).toBe(true);
	});

	test("defaults dryRun to false", () => {
		const config = resolveConfig({ baseUrl: "https://example.com" });
		expect(config.dryRun).toBe(false);
	});

	test("uses custom dryRun when provided", () => {
		const config = resolveConfig({
			baseUrl: "https://example.com",
			dryRun: true,
		});
		expect(config.dryRun).toBe(true);
	});

	test("passes through optional fields as-is", () => {
		const lastmod = () => "2025-01-01";
		const images = () => [{ loc: "https://example.com/img.jpg" }];
		const config = resolveConfig({
			baseUrl: "https://example.com",
			trailingSlash: true,
			lastmod,
			priority: 0.5,
			changefreq: "weekly",
			images,
		});
		expect(config.trailingSlash).toBe(true);
		expect(config.lastmod).toBe(lastmod);
		expect(config.priority).toBe(0.5);
		expect(config.changefreq).toBe("weekly");
		expect(config.images).toBe(images);
	});
});
