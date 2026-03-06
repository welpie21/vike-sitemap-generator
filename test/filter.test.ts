import { describe, expect, test } from "bun:test";
import { filterExcludedUrls } from "../src/filter.ts";

const allUrls = ["/", "/about", "/admin", "/admin/settings", "/blog/post-1"];

describe("filterExcludedUrls", () => {
	test("returns all URLs when exclude list is empty", () => {
		expect(filterExcludedUrls(allUrls, [])).toEqual(allUrls);
	});

	test("excludes exact string matches", () => {
		const result = filterExcludedUrls(allUrls, ["/admin"]);
		expect(result).toEqual(["/", "/about", "/admin/settings", "/blog/post-1"]);
	});

	test("excludes multiple exact strings", () => {
		const result = filterExcludedUrls(allUrls, ["/admin", "/about"]);
		expect(result).toEqual(["/", "/admin/settings", "/blog/post-1"]);
	});

	test("excludes paths matching a RegExp", () => {
		const result = filterExcludedUrls(allUrls, [/^\/admin/]);
		expect(result).toEqual(["/", "/about", "/blog/post-1"]);
	});

	test("supports mixing strings and RegExps", () => {
		const result = filterExcludedUrls(allUrls, ["/about", /^\/blog/]);
		expect(result).toEqual(["/", "/admin", "/admin/settings"]);
	});

	test("does not exclude URLs that don't match any pattern", () => {
		const result = filterExcludedUrls(allUrls, ["/nonexistent", /^\/xyz/]);
		expect(result).toEqual(allUrls);
	});

	test("can exclude all URLs", () => {
		const result = filterExcludedUrls(allUrls, [/.*/]);
		expect(result).toEqual([]);
	});
});
