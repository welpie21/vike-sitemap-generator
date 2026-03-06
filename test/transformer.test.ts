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
			const result = applyTrailingSlashes(["/about", "/blog"], [
				{ match: "/about", trailingSlash: true },
			]);
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
			const result = applyTrailingSlashes(["/about", "/contact"], [
				{ match: /^\/blog/, trailingSlash: true },
			]);
			expect(result).toEqual(["/about", "/contact"]);
		});

		test("first matching rule wins", () => {
			const result = applyTrailingSlashes(["/blog/post"], [
				{ match: /^\/blog/, trailingSlash: true },
				{ match: "/blog/post", trailingSlash: false },
			]);
			expect(result).toEqual(["/blog/post/"]);
		});

		test("can remove trailing slashes per-route", () => {
			const result = applyTrailingSlashes(["/api/", "/api/users/"], [
				{ match: /^\/api/, trailingSlash: false },
			]);
			expect(result).toEqual(["/api", "/api/users"]);
		});
	});
});
