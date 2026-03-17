import { describe, expect, test } from "bun:test";
import { filterExcludedUrls } from "../src/filter.ts";
import type { CollectedUrl } from "../src/types.ts";

function toCollected(urls: string[]): CollectedUrl[] {
	return urls.map((url) => ({ url }));
}

function toUrls(items: CollectedUrl[]): string[] {
	return items.map((item) => item.url);
}

const allUrls = ["/", "/about", "/admin", "/admin/settings", "/blog/post-1"];

describe("filterExcludedUrls", () => {
	test("returns all URLs when exclude list is empty", () => {
		expect(toUrls(filterExcludedUrls(toCollected(allUrls), []))).toEqual(
			allUrls,
		);
	});

	test("excludes exact string matches", () => {
		const result = filterExcludedUrls(toCollected(allUrls), ["/admin"]);
		expect(toUrls(result)).toEqual([
			"/",
			"/about",
			"/admin/settings",
			"/blog/post-1",
		]);
	});

	test("excludes multiple exact strings", () => {
		const result = filterExcludedUrls(toCollected(allUrls), [
			"/admin",
			"/about",
		]);
		expect(toUrls(result)).toEqual(["/", "/admin/settings", "/blog/post-1"]);
	});

	test("excludes paths matching a RegExp", () => {
		const result = filterExcludedUrls(toCollected(allUrls), [/^\/admin/]);
		expect(toUrls(result)).toEqual(["/", "/about", "/blog/post-1"]);
	});

	test("supports mixing strings and RegExps", () => {
		const result = filterExcludedUrls(toCollected(allUrls), [
			"/about",
			/^\/blog/,
		]);
		expect(toUrls(result)).toEqual(["/", "/admin", "/admin/settings"]);
	});

	test("does not exclude URLs that don't match any pattern", () => {
		const result = filterExcludedUrls(toCollected(allUrls), [
			"/nonexistent",
			/^\/xyz/,
		]);
		expect(toUrls(result)).toEqual(allUrls);
	});

	test("can exclude all URLs", () => {
		const result = filterExcludedUrls(toCollected(allUrls), [/.*/]);
		expect(toUrls(result)).toEqual([]);
	});

	test("preserves pageConfig through filtering", () => {
		const items: CollectedUrl[] = [
			{ url: "/about", pageConfig: { priority: 0.8 } },
			{ url: "/admin" },
		];
		const result = filterExcludedUrls(items, ["/admin"]);
		expect(result).toEqual([{ url: "/about", pageConfig: { priority: 0.8 } }]);
	});
});
