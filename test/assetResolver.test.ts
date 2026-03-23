import { describe, expect, test } from "bun:test";
import { resolveImageAssets } from "../src/assetResolver.ts";
import type { SitemapEntry } from "../src/types.ts";

describe("resolveImageAssets", () => {
	const manifest = {
		"src/assets/img/embeds/main.png": {
			file: "assets/static/main.CCTckWB9.png",
			src: "src/assets/img/embeds/main.png",
		},
		"src/assets/logo.svg": {
			file: "assets/static/logo.Kf9d3e1r.svg",
			src: "src/assets/logo.svg",
		},
	};
	const projectRoot = "/Users/dev/project";
	const baseUrl = "https://example.com";

	test("resolves pointer import with zero-width space prefix", () => {
		const entries: SitemapEntry[] = [
			{
				loc: "https://example.com/",
				images: [
					{
						loc: "\u200Bimport:/Users/dev/project/src/assets/img/embeds/main.png:default",
						title: "Main image",
					},
				],
			},
		];

		const result = resolveImageAssets(entries, manifest, projectRoot, baseUrl);

		expect(result[0]?.images?.[0]?.loc).toBe(
			"https://example.com/assets/static/main.CCTckWB9.png",
		);
		expect(result[0]?.images?.[0]?.title).toBe("Main image");
	});

	test("resolves pointer import without zero-width space prefix", () => {
		const entries: SitemapEntry[] = [
			{
				loc: "https://example.com/",
				images: [
					{
						loc: "import:/Users/dev/project/src/assets/img/embeds/main.png:default",
						title: "Main image",
					},
				],
			},
		];

		const result = resolveImageAssets(entries, manifest, projectRoot, baseUrl);

		expect(result[0]?.images?.[0]?.loc).toBe(
			"https://example.com/assets/static/main.CCTckWB9.png",
		);
	});

	test("resolves multiple images in a single entry", () => {
		const entries: SitemapEntry[] = [
			{
				loc: "https://example.com/",
				images: [
					{
						loc: "\u200Bimport:/Users/dev/project/src/assets/img/embeds/main.png:default",
					},
					{
						loc: "\u200Bimport:/Users/dev/project/src/assets/logo.svg:default",
					},
				],
			},
		];

		const result = resolveImageAssets(entries, manifest, projectRoot, baseUrl);

		expect(result[0]?.images?.[0]?.loc).toBe(
			"https://example.com/assets/static/main.CCTckWB9.png",
		);
		expect(result[0]?.images?.[1]?.loc).toBe(
			"https://example.com/assets/static/logo.Kf9d3e1r.svg",
		);
	});

	test("leaves regular URLs unchanged", () => {
		const entries: SitemapEntry[] = [
			{
				loc: "https://example.com/",
				images: [
					{
						loc: "https://cdn.example.com/image.png",
						title: "External image",
					},
				],
			},
		];

		const result = resolveImageAssets(entries, manifest, projectRoot, baseUrl);

		expect(result[0]?.images?.[0]?.loc).toBe(
			"https://cdn.example.com/image.png",
		);
	});

	test("leaves relative paths unchanged", () => {
		const entries: SitemapEntry[] = [
			{
				loc: "https://example.com/",
				images: [{ loc: "/assets/manually-placed.png" }],
			},
		];

		const result = resolveImageAssets(entries, manifest, projectRoot, baseUrl);

		expect(result[0]?.images?.[0]?.loc).toBe("/assets/manually-placed.png");
	});

	test("leaves pointer import unchanged when not found in manifest", () => {
		const entries: SitemapEntry[] = [
			{
				loc: "https://example.com/",
				images: [
					{
						loc: "\u200Bimport:/Users/dev/project/src/assets/missing.png:default",
					},
				],
			},
		];

		const result = resolveImageAssets(entries, manifest, projectRoot, baseUrl);

		expect(result[0]?.images?.[0]?.loc).toBe(
			"\u200Bimport:/Users/dev/project/src/assets/missing.png:default",
		);
	});

	test("skips entries without images", () => {
		const entries: SitemapEntry[] = [
			{ loc: "https://example.com/" },
			{ loc: "https://example.com/about", images: [] },
		];

		const result = resolveImageAssets(entries, manifest, projectRoot, baseUrl);

		expect(result).toEqual(entries);
	});

	test("preserves non-image fields on entries", () => {
		const entries: SitemapEntry[] = [
			{
				loc: "https://example.com/",
				priority: 1.0,
				changefreq: "weekly",
				lastmod: "2025-01-01",
				images: [
					{
						loc: "\u200Bimport:/Users/dev/project/src/assets/img/embeds/main.png:default",
						title: "Title",
						caption: "Caption",
					},
				],
			},
		];

		const result = resolveImageAssets(entries, manifest, projectRoot, baseUrl);

		expect(result[0]?.loc).toBe("https://example.com/");
		expect(result[0]?.priority).toBe(1.0);
		expect(result[0]?.changefreq).toBe("weekly");
		expect(result[0]?.lastmod).toBe("2025-01-01");
		expect(result[0]?.images?.[0]?.caption).toBe("Caption");
	});

	test("handles named exports in pointer imports", () => {
		const entries: SitemapEntry[] = [
			{
				loc: "https://example.com/",
				images: [
					{
						loc: "\u200Bimport:/Users/dev/project/src/assets/img/embeds/main.png:namedExport",
					},
				],
			},
		];

		const result = resolveImageAssets(entries, manifest, projectRoot, baseUrl);

		expect(result[0]?.images?.[0]?.loc).toBe(
			"https://example.com/assets/static/main.CCTckWB9.png",
		);
	});
});
