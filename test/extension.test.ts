import { describe, expect, test } from "bun:test";
import vikeSitemapConfig from "../src/config.ts";

describe("Vike extension config", () => {
	test("exports a config object with name", () => {
		expect(vikeSitemapConfig.name).toBe("vike-sitemap-generator");
	});

	test("defines sitemap in meta", () => {
		expect(vikeSitemapConfig.meta).toBeDefined();
		expect(vikeSitemapConfig.meta?.sitemap).toBeDefined();
	});

	test("sitemap meta has env.config set to true", () => {
		const sitemapMeta = vikeSitemapConfig.meta?.sitemap;
		expect(sitemapMeta).toBeDefined();
		expect(sitemapMeta?.env).toBeDefined();
		expect(sitemapMeta?.env.config).toBe(true);
	});
});
