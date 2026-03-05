import { describe, expect, test } from "bun:test";
import { resolveConfig } from "../src/config.ts";

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

	test("passes through optional fields as-is", () => {
		const lastmod = () => "2025-01-01";
		const config = resolveConfig({
			baseUrl: "https://example.com",
			trailingSlash: true,
			lastmod,
			priority: 0.5,
		});
		expect(config.trailingSlash).toBe(true);
		expect(config.lastmod).toBe(lastmod);
		expect(config.priority).toBe(0.5);
	});
});
