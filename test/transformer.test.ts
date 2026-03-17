import { describe, expect, test } from "bun:test";
import { applyTrailingSlashes } from "../src/transformer.ts";
import type { CollectedUrl } from "../src/types.ts";

function toCollected(urls: string[]): CollectedUrl[] {
	return urls.map((url) => ({ url }));
}

function toUrls(items: CollectedUrl[]): string[] {
	return items.map((item) => item.url);
}

describe("applyTrailingSlashes", () => {
	const urls = ["/", "/about", "/blog/post"];

	test("returns urls unchanged when config is undefined", () => {
		expect(toUrls(applyTrailingSlashes(toCollected(urls), undefined))).toEqual(
			urls,
		);
	});

	describe("boolean config", () => {
		test("adds trailing slashes when true", () => {
			expect(toUrls(applyTrailingSlashes(toCollected(urls), true))).toEqual([
				"/",
				"/about/",
				"/blog/post/",
			]);
		});

		test("does not double trailing slashes", () => {
			expect(
				toUrls(applyTrailingSlashes(toCollected(["/about/"]), true)),
			).toEqual(["/about/"]);
		});

		test("removes trailing slashes when false", () => {
			expect(
				toUrls(
					applyTrailingSlashes(toCollected(["/", "/about/", "/blog/"]), false),
				),
			).toEqual(["/", "/about", "/blog"]);
		});

		test("keeps root slash unchanged regardless of config", () => {
			expect(toUrls(applyTrailingSlashes(toCollected(["/"]), true))).toEqual([
				"/",
			]);
			expect(toUrls(applyTrailingSlashes(toCollected(["/"]), false))).toEqual([
				"/",
			]);
		});

		test("does not strip from paths without trailing slash when false", () => {
			expect(
				toUrls(applyTrailingSlashes(toCollected(["/about"]), false)),
			).toEqual(["/about"]);
		});
	});

	describe("per-route rules config", () => {
		test("applies exact path match", () => {
			const result = applyTrailingSlashes(toCollected(["/about", "/blog"]), [
				{ match: "/about", trailingSlash: true },
			]);
			expect(toUrls(result)).toEqual(["/about/", "/blog"]);
		});

		test("applies regex pattern matching", () => {
			const result = applyTrailingSlashes(
				toCollected(["/blog", "/blog/post-1", "/blog/post-2", "/docs"]),
				[{ match: /^\/blog(\/|$)/, trailingSlash: true }],
			);
			expect(toUrls(result)).toEqual([
				"/blog/",
				"/blog/post-1/",
				"/blog/post-2/",
				"/docs",
			]);
		});

		test("leaves unmatched paths unchanged", () => {
			const result = applyTrailingSlashes(toCollected(["/about", "/contact"]), [
				{ match: /^\/blog/, trailingSlash: true },
			]);
			expect(toUrls(result)).toEqual(["/about", "/contact"]);
		});

		test("first matching rule wins", () => {
			const result = applyTrailingSlashes(toCollected(["/blog/post"]), [
				{ match: /^\/blog/, trailingSlash: true },
				{ match: "/blog/post", trailingSlash: false },
			]);
			expect(toUrls(result)).toEqual(["/blog/post/"]);
		});

		test("can remove trailing slashes per-route", () => {
			const result = applyTrailingSlashes(
				toCollected(["/api/", "/api/users/"]),
				[{ match: /^\/api/, trailingSlash: false }],
			);
			expect(toUrls(result)).toEqual(["/api", "/api/users"]);
		});
	});

	describe("function config", () => {
		test("adds trailing slash when URL has children", () => {
			const allUrls = ["/", "/blog", "/blog/post-1", "/blog/post-2", "/about"];
			const result = applyTrailingSlashes(
				toCollected(allUrls),
				(url, { urls }) => {
					return urls.some((u) => u !== url && u.startsWith(`${url}/`));
				},
			);
			expect(toUrls(result)).toEqual([
				"/",
				"/blog/",
				"/blog/post-1",
				"/blog/post-2",
				"/about",
			]);
		});

		test("removes trailing slash for leaf URLs", () => {
			const allUrls = ["/blog/", "/blog/post/", "/about/"];
			const result = applyTrailingSlashes(
				toCollected(allUrls),
				(url, { urls }) => {
					const normalized = url.endsWith("/") ? url.slice(0, -1) : url;
					return urls.some((u) => {
						const n = u.endsWith("/") ? u.slice(0, -1) : u;
						return n !== normalized && n.startsWith(`${normalized}/`);
					});
				},
			);
			expect(toUrls(result)).toEqual(["/blog/", "/blog/post", "/about"]);
		});

		test("receives correct context with all URLs", () => {
			const allUrls = ["/a", "/b", "/c"];
			let receivedContext: { urls: string[] } | undefined;
			applyTrailingSlashes(toCollected(allUrls), (_url, context) => {
				receivedContext = context;
				return false;
			});
			expect(receivedContext?.urls).toEqual(allUrls);
		});

		test("keeps root slash unchanged", () => {
			const result = applyTrailingSlashes(
				toCollected(["/", "/about"]),
				() => true,
			);
			expect(toUrls(result)).toEqual(["/", "/about/"]);
		});
	});

	test("preserves pageConfig through transformation", () => {
		const items: CollectedUrl[] = [
			{ url: "/about", pageConfig: { priority: 0.8 } },
			{ url: "/blog" },
		];
		const result = applyTrailingSlashes(items, true);
		expect(result[0]?.pageConfig).toEqual({ priority: 0.8 });
		expect(result[0]?.url).toBe("/about/");
	});
});
