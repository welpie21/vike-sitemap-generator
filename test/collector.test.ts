import { describe, expect, test } from "bun:test";
import { collectUrls, matchRoute } from "../src/collector.ts";

function mockVikeConfig(opts: {
	pages?: Record<
		string,
		{
			route?: string;
			isErrorPage?: true;
			sitemap?: Record<string, unknown> | ((...args: any[]) => any);
		}
	>;
	prerenderContextUrls?: string[];
	prerenderContexts?: Array<{ urlOriginal: string; data?: unknown }>;
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

	let pageContexts: any = null;
	if (opts.prerenderContexts) {
		pageContexts = opts.prerenderContexts;
	} else if (opts.prerenderContextUrls) {
		pageContexts = opts.prerenderContextUrls.map((url) => ({
			urlOriginal: url,
		}));
	}

	return {
		pages,
		config: {},
		_source: {},
		_sources: {},
		_from: {},
		prerenderContext: pageContexts
			? { pageContexts, output: [] }
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

	describe("dynamic routes in SSG mode", () => {
		test("attaches pageConfig from parameterized route to prerendered URL", () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/blog/@slug": {
						route: "/blog/@slug",
						sitemap: { priority: 0.7, changefreq: "weekly" },
					},
				},
				prerenderContextUrls: ["/blog/post-1", "/blog/post-2"],
			});
			const result = collectUrls(vike, []);
			expect(result).toEqual([
				{
					url: "/blog/post-1",
					pageConfig: { priority: 0.7, changefreq: "weekly" },
					routeParams: { slug: "post-1" },
				},
				{
					url: "/blog/post-2",
					pageConfig: { priority: 0.7, changefreq: "weekly" },
					routeParams: { slug: "post-2" },
				},
			]);
		});

		test("extracts multiple route params", () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/blog/@year/@slug": {
						route: "/blog/@year/@slug",
						sitemap: { priority: 0.6 },
					},
				},
				prerenderContextUrls: ["/blog/2025/hello-world"],
			});
			const result = collectUrls(vike, []);
			expect(result[0]?.routeParams).toEqual({
				year: "2025",
				slug: "hello-world",
			});
		});

		test("attaches function pageConfig from parameterized route", () => {
			const sitemapFn = ({ routeParams }: any) => ({
				priority: routeParams.slug === "featured" ? 1.0 : 0.5,
			});
			const vike = mockVikeConfig({
				pages: {
					"/pages/blog/@slug": {
						route: "/blog/@slug",
						sitemap: sitemapFn,
					},
				},
				prerenderContextUrls: ["/blog/featured", "/blog/regular"],
			});
			const result = collectUrls(vike, []);
			expect(typeof result[0]?.pageConfig).toBe("function");
			expect(result[0]?.routeParams).toEqual({ slug: "featured" });
			expect(result[1]?.routeParams).toEqual({ slug: "regular" });
		});

		test("matches static routes alongside dynamic routes", () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/index": { route: "/" },
					"/pages/about": {
						route: "/about",
						sitemap: { priority: 0.8 },
					},
					"/pages/blog/@slug": {
						route: "/blog/@slug",
						sitemap: { priority: 0.7 },
					},
				},
				prerenderContextUrls: ["/", "/about", "/blog/post-1"],
			});
			const result = collectUrls(vike, []);
			expect(result).toEqual([
				{ url: "/", pageConfig: undefined, routeParams: {} },
				{
					url: "/about",
					pageConfig: { priority: 0.8 },
					routeParams: {},
				},
				{
					url: "/blog/post-1",
					pageConfig: { priority: 0.7 },
					routeParams: { slug: "post-1" },
				},
			]);
		});

		test("returns undefined pageConfig for URLs with no matching route", () => {
			const vike = mockVikeConfig({
				pages: {},
				prerenderContextUrls: ["/orphan-page"],
			});
			const result = collectUrls(vike, []);
			expect(result[0]?.pageConfig).toBeUndefined();
			expect(result[0]?.routeParams).toBeUndefined();
		});

		test("passes data from prerender pageContext", () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/blog/@slug": {
						route: "/blog/@slug",
						sitemap: { priority: 0.7 },
					},
				},
				prerenderContexts: [
					{
						urlOriginal: "/blog/post-1",
						data: { title: "Post 1", tags: ["ts"] },
					},
					{
						urlOriginal: "/blog/post-2",
						data: { title: "Post 2", tags: ["js"] },
					},
				],
			});
			const result = collectUrls(vike, []);
			expect(result[0]?.data).toEqual({ title: "Post 1", tags: ["ts"] });
			expect(result[1]?.data).toEqual({ title: "Post 2", tags: ["js"] });
		});

		test("data is undefined when pageContext has no data", () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/about": { route: "/about" },
				},
				prerenderContextUrls: ["/about"],
			});
			const result = collectUrls(vike, []);
			expect(result[0]?.data).toBeUndefined();
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

describe("matchRoute", () => {
	test("matches static route exactly", () => {
		expect(matchRoute("/about", "/about")).toEqual({});
	});

	test("returns null for non-matching static route", () => {
		expect(matchRoute("/about", "/contact")).toBeNull();
	});

	test("extracts single param", () => {
		expect(matchRoute("/blog/hello", "/blog/@slug")).toEqual({
			slug: "hello",
		});
	});

	test("extracts multiple params", () => {
		expect(matchRoute("/blog/2025/hello", "/blog/@year/@slug")).toEqual({
			year: "2025",
			slug: "hello",
		});
	});

	test("returns null when segment count differs", () => {
		expect(matchRoute("/blog/2025/hello", "/blog/@slug")).toBeNull();
	});

	test("returns null when static segment mismatches", () => {
		expect(matchRoute("/posts/hello", "/blog/@slug")).toBeNull();
	});

	test("matches root path", () => {
		expect(matchRoute("/", "/")).toEqual({});
	});

	test("handles param at first segment", () => {
		expect(matchRoute("/42", "/@id")).toEqual({ id: "42" });
	});
});
