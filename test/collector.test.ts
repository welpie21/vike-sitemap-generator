import { describe, expect, test } from "bun:test";
import { collectUrls, matchRoute } from "../src/collector.ts";

function mockVikeConfig(opts: {
	pages?: Record<
		string,
		{
			route?: string | ((...args: any[]) => any);
			isErrorPage?: true;
			sitemap?: Record<string, unknown> | ((...args: any[]) => any);
			sitemapUrls?: string[] | (() => string[] | Promise<string[]>);
			routeFilesystem?: string;
		}
	>;
	prerenderContextUrls?: string[];
	prerenderContexts?: Array<{ urlOriginal: string; data?: unknown }>;
}): any {
	const pages: Record<string, any> = {};
	if (opts.pages) {
		for (const [key, val] of Object.entries(opts.pages)) {
			pages[key] = {
				config: {
					...(val.sitemap ? { sitemap: val.sitemap } : {}),
					...(val.sitemapUrls ? { sitemapUrls: val.sitemapUrls } : {}),
				},
				_source: {},
				_sources: {},
				_from: {},
				...(val.isErrorPage
					? { isErrorPage: true as const }
					: { route: val.route }),
				...(val.routeFilesystem && {
					routeFilesystem: {
						routeString: val.routeFilesystem,
						definedAtLocation: "test",
					},
				}),
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
		test("collects all prerendered URLs", async () => {
			const vike = mockVikeConfig({
				prerenderContextUrls: ["/", "/about", "/blog/post-1"],
			});
			const result = await collectUrls(vike, []);
			expect(result.map((r) => r.url)).toEqual(["/", "/about", "/blog/post-1"]);
		});

		test("deduplicates prerendered URLs", async () => {
			const vike = mockVikeConfig({
				prerenderContextUrls: ["/about", "/about"],
			});
			const result = await collectUrls(vike, []);
			expect(result.map((r) => r.url)).toEqual(["/about"]);
		});

		test("strips query strings and hashes from prerendered URLs", async () => {
			const vike = mockVikeConfig({
				prerenderContextUrls: ["/about?foo=bar", "/blog#section"],
			});
			const result = await collectUrls(vike, []);
			expect(result.map((r) => r.url)).toEqual(["/about", "/blog"]);
		});
	});

	describe("without prerender context (SSR fallback)", () => {
		test("collects static route patterns", async () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/index": { route: "/" },
					"/pages/about": { route: "/about" },
				},
			});
			const result = await collectUrls(vike, []);
			expect(result.map((r) => r.url)).toEqual(["/", "/about"]);
		});

		test("excludes parameterized routes containing @", async () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/index": { route: "/" },
					"/pages/product": { route: "/product/@id" },
				},
			});
			const result = await collectUrls(vike, []);
			expect(result.map((r) => r.url)).toEqual(["/"]);
		});

		test("excludes error pages", async () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/index": { route: "/" },
					"/pages/_error": { isErrorPage: true },
				},
			});
			const result = await collectUrls(vike, []);
			expect(result.map((r) => r.url)).toEqual(["/"]);
		});

		test("excludes pages with function routes", async () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/index": { route: "/" },
					"/pages/custom": {},
				},
			});
			const result = await collectUrls(vike, []);
			expect(result.map((r) => r.url)).toEqual(["/"]);
		});

		test("attaches per-page sitemap config in SSR mode", async () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/about": {
						route: "/about",
						sitemap: { priority: 0.8, changefreq: "monthly" },
					},
				},
			});
			const result = await collectUrls(vike, []);
			expect(result).toEqual([
				{
					url: "/about",
					pageConfig: { priority: 0.8, changefreq: "monthly" },
				},
			]);
		});
	});

	describe("additionalUrls", () => {
		test("merges additional URLs", async () => {
			const vike = mockVikeConfig({
				pages: { "/pages/index": { route: "/" } },
			});
			const result = await collectUrls(vike, ["/extra", "/more"]);
			expect(result.map((r) => r.url)).toEqual(["/", "/extra", "/more"]);
		});

		test("deduplicates additional URLs against collected ones", async () => {
			const vike = mockVikeConfig({
				pages: { "/pages/index": { route: "/" } },
			});
			const result = await collectUrls(vike, ["/"]);
			expect(result.map((r) => r.url)).toEqual(["/"]);
		});

		test("normalizes additional URLs without leading slash", async () => {
			const vike = mockVikeConfig({ pages: {} });
			const result = await collectUrls(vike, ["about", "blog"]);
			expect(result.map((r) => r.url)).toEqual(["/about", "/blog"]);
		});

		test("additional URLs have no pageConfig when no route matches", async () => {
			const vike = mockVikeConfig({ pages: {} });
			const result = await collectUrls(vike, ["/extra"]);
			expect(result[0]?.pageConfig).toBeUndefined();
		});

		test("matches additional URLs against parameterized routes for pageConfig and routeParams", async () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/blog/@slug": {
						route: "/blog/@slug",
						sitemap: { priority: 0.7, changefreq: "weekly" },
					},
				},
			});
			const result = await collectUrls(vike, ["/blog/post-1", "/blog/post-2"]);
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

		test("attaches function pageConfig from parameterized route to additional URLs", async () => {
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
			});
			const result = await collectUrls(vike, [
				"/blog/featured",
				"/blog/regular",
			]);
			expect(typeof result[0]?.pageConfig).toBe("function");
			expect(result[0]?.routeParams).toEqual({ slug: "featured" });
			expect(result[1]?.routeParams).toEqual({ slug: "regular" });
		});

		test("matches additional URLs against static routes for pageConfig", async () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/about": {
						route: "/about",
						sitemap: { priority: 0.8 },
					},
				},
			});
			const result = await collectUrls(vike, ["/about"]);
			expect(result).toEqual([
				{
					url: "/about",
					pageConfig: { priority: 0.8 },
				},
			]);
		});

		test("matches additional URLs via routeFilesystem for pages with function routes", async () => {
			const routeFn = () => true;
			const vike = mockVikeConfig({
				pages: {
					"/pages/blog/@slug": {
						route: routeFn,
						routeFilesystem: "/blog/@slug",
						sitemap: { priority: 0.7, changefreq: "weekly" },
					},
				},
			});
			const result = await collectUrls(vike, ["/blog/post-1", "/blog/post-2"]);
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

		test("derives route from page key for function routes without routeFilesystem", async () => {
			const routeFn = () => true;
			const vike = mockVikeConfig({
				pages: {
					"/src/pages/blog/@slug": {
						route: routeFn,
						sitemap: { priority: 0.7, changefreq: "weekly" },
					},
				},
			});
			const result = await collectUrls(vike, ["/blog/post-1"]);
			expect(result).toEqual([
				{
					url: "/blog/post-1",
					pageConfig: { priority: 0.7, changefreq: "weekly" },
					routeParams: { slug: "post-1" },
				},
			]);
		});
	});

	describe("sitemapUrls", () => {
		test("enumerates URLs from static sitemapUrls array", async () => {
			const vike = mockVikeConfig({
				pages: {
					"/src/pages/blog/@slug": {
						route: "/blog/@slug",
						sitemap: { priority: 0.7 },
						sitemapUrls: ["/blog/post-1", "/blog/post-2"],
					},
				},
			});
			const result = await collectUrls(vike, []);
			expect(result).toEqual([
				{
					url: "/blog/post-1",
					pageConfig: { priority: 0.7 },
					routeParams: { slug: "post-1" },
				},
				{
					url: "/blog/post-2",
					pageConfig: { priority: 0.7 },
					routeParams: { slug: "post-2" },
				},
			]);
		});

		test("enumerates URLs from sitemapUrls function", async () => {
			const vike = mockVikeConfig({
				pages: {
					"/src/pages/blog/@slug": {
						route: "/blog/@slug",
						sitemap: { priority: 0.7 },
						sitemapUrls: () => ["/blog/post-1", "/blog/post-2"],
					},
				},
			});
			const result = await collectUrls(vike, []);
			expect(result.map((r) => r.url)).toEqual([
				"/blog/post-1",
				"/blog/post-2",
			]);
		});

		test("enumerates URLs from async sitemapUrls function", async () => {
			const vike = mockVikeConfig({
				pages: {
					"/src/pages/blog/@slug": {
						route: "/blog/@slug",
						sitemapUrls: async () => ["/blog/async-1"],
					},
				},
			});
			const result = await collectUrls(vike, []);
			expect(result.map((r) => r.url)).toEqual(["/blog/async-1"]);
		});

		test("deduplicates sitemapUrls against SSR-collected static routes", async () => {
			const vike = mockVikeConfig({
				pages: {
					"/src/pages/blog": {
						route: "/blog",
						sitemap: { priority: 0.8 },
					},
					"/src/pages/blog/@slug": {
						route: "/blog/@slug",
						sitemapUrls: ["/blog"],
					},
				},
			});
			const result = await collectUrls(vike, []);
			expect(result).toEqual([{ url: "/blog", pageConfig: { priority: 0.8 } }]);
		});

		test("deduplicates sitemapUrls against additionalUrls", async () => {
			const vike = mockVikeConfig({
				pages: {
					"/src/pages/blog/@slug": {
						route: "/blog/@slug",
						sitemapUrls: ["/blog/post-1"],
					},
				},
			});
			const result = await collectUrls(vike, ["/blog/post-1"]);
			expect(result.map((r) => r.url)).toEqual(["/blog/post-1"]);
		});

		test("collects sitemapUrls from multiple pages", async () => {
			const vike = mockVikeConfig({
				pages: {
					"/src/pages/blog/@slug": {
						route: "/blog/@slug",
						sitemapUrls: ["/blog/post-1"],
					},
					"/src/pages/events/@slug": {
						route: "/events/@slug",
						sitemapUrls: ["/events/conf-2026"],
					},
				},
			});
			const result = await collectUrls(vike, []);
			expect(result.map((r) => r.url)).toEqual([
				"/blog/post-1",
				"/events/conf-2026",
			]);
		});

		test("attaches function sitemap config from route to sitemapUrls entries", async () => {
			const sitemapFn = ({ routeParams }: any) => ({
				priority: routeParams.slug === "featured" ? 1.0 : 0.5,
			});
			const vike = mockVikeConfig({
				pages: {
					"/src/pages/blog/@slug": {
						route: "/blog/@slug",
						sitemap: sitemapFn,
						sitemapUrls: ["/blog/featured", "/blog/regular"],
					},
				},
			});
			const result = await collectUrls(vike, []);
			expect(typeof result[0]?.pageConfig).toBe("function");
			expect(result[0]?.routeParams).toEqual({ slug: "featured" });
			expect(result[1]?.routeParams).toEqual({ slug: "regular" });
		});

		test("works with function routes via page key derivation", async () => {
			const routeFn = () => true;
			const vike = mockVikeConfig({
				pages: {
					"/src/pages/blog/@slug": {
						route: routeFn,
						sitemap: { priority: 0.7 },
						sitemapUrls: ["/blog/post-1"],
					},
				},
			});
			const result = await collectUrls(vike, []);
			expect(result).toEqual([
				{
					url: "/blog/post-1",
					pageConfig: { priority: 0.7 },
					routeParams: { slug: "post-1" },
				},
			]);
		});
	});

	describe("dynamic routes in SSG mode", () => {
		test("attaches pageConfig from parameterized route to prerendered URL", async () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/blog/@slug": {
						route: "/blog/@slug",
						sitemap: { priority: 0.7, changefreq: "weekly" },
					},
				},
				prerenderContextUrls: ["/blog/post-1", "/blog/post-2"],
			});
			const result = await collectUrls(vike, []);
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

		test("extracts multiple route params", async () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/blog/@year/@slug": {
						route: "/blog/@year/@slug",
						sitemap: { priority: 0.6 },
					},
				},
				prerenderContextUrls: ["/blog/2025/hello-world"],
			});
			const result = await collectUrls(vike, []);
			expect(result[0]?.routeParams).toEqual({
				year: "2025",
				slug: "hello-world",
			});
		});

		test("attaches function pageConfig from parameterized route", async () => {
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
			const result = await collectUrls(vike, []);
			expect(typeof result[0]?.pageConfig).toBe("function");
			expect(result[0]?.routeParams).toEqual({ slug: "featured" });
			expect(result[1]?.routeParams).toEqual({ slug: "regular" });
		});

		test("matches static routes alongside dynamic routes", async () => {
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
			const result = await collectUrls(vike, []);
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

		test("returns undefined pageConfig for URLs with no matching route", async () => {
			const vike = mockVikeConfig({
				pages: {},
				prerenderContextUrls: ["/orphan-page"],
			});
			const result = await collectUrls(vike, []);
			expect(result[0]?.pageConfig).toBeUndefined();
			expect(result[0]?.routeParams).toBeUndefined();
		});

		test("passes data from prerender pageContext", async () => {
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
			const result = await collectUrls(vike, []);
			expect(result[0]?.data).toEqual({ title: "Post 1", tags: ["ts"] });
			expect(result[1]?.data).toEqual({ title: "Post 2", tags: ["js"] });
		});

		test("data is undefined when pageContext has no data", async () => {
			const vike = mockVikeConfig({
				pages: {
					"/pages/about": { route: "/about" },
				},
				prerenderContextUrls: ["/about"],
			});
			const result = await collectUrls(vike, []);
			expect(result[0]?.data).toBeUndefined();
		});
	});

	test("returns sorted URLs", async () => {
		const vike = mockVikeConfig({
			prerenderContextUrls: ["/z-page", "/a-page", "/m-page"],
		});
		const result = await collectUrls(vike, []);
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
