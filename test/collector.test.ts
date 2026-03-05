import { describe, expect, test } from "bun:test";
import { collectUrls } from "../src/collector.ts";

// Helper to create a mock VikeConfig. We use `as any` because the real
// VikeConfig type has many internal fields we don't need for unit tests.
function mockVikeConfig(opts: {
	pages?: Record<string, { route?: string; isErrorPage?: true }>;
	prerenderContextUrls?: string[];
}): any {
	const pages: Record<string, any> = {};
	if (opts.pages) {
		for (const [key, val] of Object.entries(opts.pages)) {
			pages[key] = {
				config: {},
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
			const urls = collectUrls(vike, []);
			expect(urls).toEqual(["/", "/about", "/blog/post-1"]);
		});

		test("deduplicates prerendered URLs", () => {
			const vike = mockVikeConfig({
				prerenderContextUrls: ["/about", "/about"],
			});
			const urls = collectUrls(vike, []);
			expect(urls).toEqual(["/about"]);
		});

		test("strips query strings and hashes from prerendered URLs", () => {
			const vike = mockVikeConfig({
				prerenderContextUrls: ["/about?foo=bar", "/blog#section"],
			});
			const urls = collectUrls(vike, []);
			expect(urls).toEqual(["/about", "/blog"]);
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
			const urls = collectUrls(vike, []);
			expect(urls).toEqual(["/", "/about"]);
		});

		test("excludes parameterized routes containing @", () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/index": { route: "/" },
					"/pages/product": { route: "/product/@id" },
				},
			});
			const urls = collectUrls(vike, []);
			expect(urls).toEqual(["/"]);
		});

		test("excludes error pages", () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/index": { route: "/" },
					"/pages/_error": { isErrorPage: true },
				},
			});
			const urls = collectUrls(vike, []);
			expect(urls).toEqual(["/"]);
		});

		test("excludes pages with function routes", () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/index": { route: "/" },
					"/pages/custom": {}, // route is a function (not a string), simulated as undefined
				},
			});
			const urls = collectUrls(vike, []);
			expect(urls).toEqual(["/"]);
		});
	});

	describe("additionalUrls", () => {
		test("merges additional URLs", () => {
			const vike = mockVikeConfig({
				pages: { "/pages/index": { route: "/" } },
			});
			const urls = collectUrls(vike, ["/extra", "/more"]);
			expect(urls).toEqual(["/", "/extra", "/more"]);
		});

		test("deduplicates additional URLs against collected ones", () => {
			const vike = mockVikeConfig({
				pages: { "/pages/index": { route: "/" } },
			});
			const urls = collectUrls(vike, ["/"]);
			expect(urls).toEqual(["/"]);
		});

		test("normalizes additional URLs without leading slash", () => {
			const vike = mockVikeConfig({ pages: {} });
			const urls = collectUrls(vike, ["about", "blog"]);
			expect(urls).toEqual(["/about", "/blog"]);
		});
	});

	test("returns sorted URLs", () => {
		const vike = mockVikeConfig({
			prerenderContextUrls: ["/z-page", "/a-page", "/m-page"],
		});
		const urls = collectUrls(vike, []);
		expect(urls).toEqual(["/a-page", "/m-page", "/z-page"]);
	});
});
