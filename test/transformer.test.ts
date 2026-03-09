import { describe, expect, test } from "bun:test";
import { applyTrailingSlashes } from "../src/transformer.ts";

describe("applyTrailingSlashes", () => {
	const urls = ["/", "/about", "/blog/post"];

	test("returns urls unchanged when config is undefined", () => {
		expect(applyTrailingSlashes(urls, undefined)).toEqual(urls);
	});

	describe("boolean config", () => {
		test("adds trailing slashes when true", () => {
			expect(applyTrailingSlashes(urls, true)).toEqual([
				"/",
				"/about/",
				"/blog/post/",
			]);
		});

		test("does not double trailing slashes", () => {
			expect(applyTrailingSlashes(["/about/"], true)).toEqual(["/about/"]);
		});

		test("removes trailing slashes when false", () => {
			expect(applyTrailingSlashes(["/", "/about/", "/blog/"], false)).toEqual([
				"/",
				"/about",
				"/blog",
			]);
		});

		test("keeps root slash unchanged regardless of config", () => {
			expect(applyTrailingSlashes(["/"], true)).toEqual(["/"]);
			expect(applyTrailingSlashes(["/"], false)).toEqual(["/"]);
		});

		test("does not strip from paths without trailing slash when false", () => {
			expect(applyTrailingSlashes(["/about"], false)).toEqual(["/about"]);
		});
	});

	describe("per-route rules config", () => {
		test("applies exact path match", () => {
			const result = applyTrailingSlashes(
				["/about", "/blog"],
				[{ match: "/about", trailingSlash: true }],
			);
			expect(result).toEqual(["/about/", "/blog"]);
		});

		test("applies regex pattern matching", () => {
			const result = applyTrailingSlashes(
				["/blog", "/blog/post-1", "/blog/post-2", "/docs"],
				[{ match: /^\/blog(\/|$)/, trailingSlash: true }],
			);
			expect(result).toEqual([
				"/blog/",
				"/blog/post-1/",
				"/blog/post-2/",
				"/docs",
			]);
		});

		test("leaves unmatched paths unchanged", () => {
			const result = applyTrailingSlashes(
				["/about", "/contact"],
				[{ match: /^\/blog/, trailingSlash: true }],
			);
			expect(result).toEqual(["/about", "/contact"]);
		});

		test("first matching rule wins", () => {
			const result = applyTrailingSlashes(
				["/blog/post"],
				[
					{ match: /^\/blog/, trailingSlash: true },
					{ match: "/blog/post", trailingSlash: false },
				],
			);
			expect(result).toEqual(["/blog/post/"]);
		});

		test("can remove trailing slashes per-route", () => {
			const result = applyTrailingSlashes(
				["/api/", "/api/users/"],
				[{ match: /^\/api/, trailingSlash: false }],
			);
			expect(result).toEqual(["/api", "/api/users"]);
		});
	});

	describe("function config", () => {
		test("adds trailing slash when URL has children", () => {
			const allUrls = ["/", "/blog", "/blog/post-1", "/blog/post-2", "/about"];
			const result = applyTrailingSlashes(allUrls, (url, { urls }) => {
				return urls.some((u) => u !== url && u.startsWith(`${url}/`));
			});
			expect(result).toEqual([
				"/",
				"/blog/",
				"/blog/post-1",
				"/blog/post-2",
				"/about",
			]);
		});

		test("removes trailing slash for leaf URLs", () => {
			const allUrls = ["/blog/", "/blog/post/", "/about/"];
			const result = applyTrailingSlashes(allUrls, (url, { urls }) => {
				const normalized = url.endsWith("/") ? url.slice(0, -1) : url;
				return urls.some(
					(u) => {
						const n = u.endsWith("/") ? u.slice(0, -1) : u;
						return n !== normalized && n.startsWith(`${normalized}/`);
					},
				);
			});
			expect(result).toEqual(["/blog/", "/blog/post", "/about"]);
		});

		test("receives correct context with all URLs", () => {
			const allUrls = ["/a", "/b", "/c"];
			let receivedContext: { urls: string[] } | undefined;
			applyTrailingSlashes(allUrls, (_url, context) => {
				receivedContext = context;
				return false;
			});
			expect(receivedContext?.urls).toEqual(allUrls);
		});

		test("keeps root slash unchanged", () => {
			const result = applyTrailingSlashes(["/", "/about"], () => true);
			expect(result).toEqual(["/", "/about/"]);
		});
	});
});
