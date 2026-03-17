import { describe, expect, test } from "bun:test";
import { collectUrls } from "../src/collector.ts";

function mockVikeConfig(opts: {
	pages?: Record<
		string,
		{
			route?: string;
			isErrorPage?: true;
			sitemap?: Record<string, unknown>;
		}
	>;
	prerenderContextUrls?: string[];
}): any {
	const pages: Record<string, any> = {};
	if (opts.pages) {
		for (const [key, val] of Object.entries(opts.pages)) {
			pages[key] = {
				config: { ...(val.sitemap ? { sitemap: val.sitemap } : {}) },
				_source: {},
				_sources: {},
				_from: {},
				...(val.isErrorPage
					? { isErrorPage: true as const }
					: { route: val.route }),
			};
		}
	}

	return {
		pages,
		config: {},
		_source: {},
		_sources: {},
		_from: {},
		prerenderContext: opts.prerenderContextUrls
			? {
					pageContexts: opts.prerenderContextUrls.map((url) => ({
						urlOriginal: url,
					})),
					output: [],
				}
			: { pageContexts: null, output: null },
		dangerouslyUseInternals: {},
	};
}

describe("collectUrls", () => {
	describe("with prerender context (SSG)", () => {
		test("collects all prerendered URLs", () => {
			const vike = mockVikeConfig({
				prerenderContextUrls: ["/", "/about", "/blog/post-1"],
			});
			const result = collectUrls(vike, []);
			expect(result.map((r) => r.url)).toEqual(["/", "/about", "/blog/post-1"]);
		});

		test("deduplicates prerendered URLs", () => {
			const vike = mockVikeConfig({
				prerenderContextUrls: ["/about", "/about"],
			});
			const result = collectUrls(vike, []);
			expect(result.map((r) => r.url)).toEqual(["/about"]);
		});

		test("strips query strings and hashes from prerendered URLs", () => {
			const vike = mockVikeConfig({
				prerenderContextUrls: ["/about?foo=bar", "/blog#section"],
			});
			const result = collectUrls(vike, []);
			expect(result.map((r) => r.url)).toEqual(["/about", "/blog"]);
		});
	});

	describe("without prerender context (SSR fallback)", () => {
		test("collects static route patterns", () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/index": { route: "/" },
					"/pages/about": { route: "/about" },
				},
			});
			const result = collectUrls(vike, []);
			expect(result.map((r) => r.url)).toEqual(["/", "/about"]);
		});

		test("excludes parameterized routes containing @", () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/index": { route: "/" },
					"/pages/product": { route: "/product/@id" },
				},
			});
			const result = collectUrls(vike, []);
			expect(result.map((r) => r.url)).toEqual(["/"]);
		});

		test("excludes error pages", () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/index": { route: "/" },
					"/pages/_error": { isErrorPage: true },
				},
			});
			const result = collectUrls(vike, []);
			expect(result.map((r) => r.url)).toEqual(["/"]);
		});

		test("excludes pages with function routes", () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/index": { route: "/" },
					"/pages/custom": {},
				},
			});
			const result = collectUrls(vike, []);
			expect(result.map((r) => r.url)).toEqual(["/"]);
		});

		test("attaches per-page sitemap config in SSR mode", () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/about": {
						route: "/about",
						sitemap: { priority: 0.8, changefreq: "monthly" },
					},
				},
			});
			const result = collectUrls(vike, []);
			expect(result).toEqual([
				{
					url: "/about",
					pageConfig: { priority: 0.8, changefreq: "monthly" },
				},
			]);
		});
	});

	describe("additionalUrls", () => {
		test("merges additional URLs", () => {
			const vike = mockVikeConfig({
				pages: { "/pages/index": { route: "/" } },
			});
			const result = collectUrls(vike, ["/extra", "/more"]);
			expect(result.map((r) => r.url)).toEqual(["/", "/extra", "/more"]);
		});

		test("deduplicates additional URLs against collected ones", () => {
			const vike = mockVikeConfig({
				pages: { "/pages/index": { route: "/" } },
			});
			const result = collectUrls(vike, ["/"]);
			expect(result.map((r) => r.url)).toEqual(["/"]);
		});

		test("normalizes additional URLs without leading slash", () => {
			const vike = mockVikeConfig({ pages: {} });
			const result = collectUrls(vike, ["about", "blog"]);
			expect(result.map((r) => r.url)).toEqual(["/about", "/blog"]);
		});

		test("additional URLs have no pageConfig", () => {
			const vike = mockVikeConfig({ pages: {} });
			const result = collectUrls(vike, ["/extra"]);
			expect(result[0]?.pageConfig).toBeUndefined();
		});
	});

	test("returns sorted URLs", () => {
		const vike = mockVikeConfig({
			prerenderContextUrls: ["/z-page", "/a-page", "/m-page"],
		});
		const result = collectUrls(vike, []);
		expect(result.map((r) => r.url)).toEqual(["/a-page", "/m-page", "/z-page"]);
	});
});
