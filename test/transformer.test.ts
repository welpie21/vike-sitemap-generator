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

	describe("per-path record config", () => {
		test("applies exact path match", () => {
			const result = applyTrailingSlashes(["/about", "/blog"], {
				"/about": true,
			});
			expect(result).toEqual(["/about/", "/blog"]);
		});

		test("applies glob pattern matching", () => {
			const result = applyTrailingSlashes(
				["/blog", "/blog/post-1", "/blog/post-2", "/docs"],
				{ "/blog/*": true },
			);
			expect(result).toEqual([
				"/blog/",
				"/blog/post-1/",
				"/blog/post-2/",
				"/docs",
			]);
		});

		test("glob matches the base path itself", () => {
			const result = applyTrailingSlashes(["/blog"], { "/blog/*": true });
			expect(result).toEqual(["/blog/"]);
		});

		test("leaves unmatched paths unchanged", () => {
			const result = applyTrailingSlashes(["/about", "/contact"], {
				"/blog/*": true,
			});
			expect(result).toEqual(["/about", "/contact"]);
		});

		test("first matching rule wins", () => {
			const result = applyTrailingSlashes(["/blog/post"], {
				"/blog/*": true,
				"/blog/post": false,
			});
			expect(result).toEqual(["/blog/post/"]);
		});

		test("can remove trailing slashes per-path", () => {
			const result = applyTrailingSlashes(["/api/", "/api/users/"], {
				"/api/*": false,
			});
			expect(result).toEqual(["/api", "/api/users"]);
		});
	});
});
