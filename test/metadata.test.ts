import { describe, expect, test } from "bun:test";
import { resolveMetadata } from "../src/metadata.ts";

describe("resolveMetadata", () => {
	const baseUrl = "https://example.com";

	test("creates entries with full loc URLs", async () => {
		const entries = await resolveMetadata(
			["/about", "/blog"],
			baseUrl,
			undefined,
			undefined,
			undefined,
			undefined,
		);
		expect(entries).toEqual([
			{ loc: "https://example.com/about" },
			{ loc: "https://example.com/blog" },
		]);
	});

	describe("lastmod", () => {
		test("includes lastmod when callback returns a value", async () => {
			const lastmod = () => "2025-06-15";
			const entries = await resolveMetadata(
				["/about"],
				baseUrl,
				lastmod,
				undefined,
				undefined,
				undefined,
			);
			expect(entries).toEqual([
				{ loc: "https://example.com/about", lastmod: "2025-06-15" },
			]);
		});

		test("omits lastmod when callback returns undefined", async () => {
			const lastmod = () => undefined;
			const entries = await resolveMetadata(
				["/about"],
				baseUrl,
				lastmod,
				undefined,
				undefined,
				undefined,
			);
			expect(entries).toEqual([{ loc: "https://example.com/about" }]);
		});

		test("supports async lastmod callback", async () => {
			const lastmod = async (url: string) => {
				if (url === "/about") return "2025-01-01";
				return undefined;
			};
			const entries = await resolveMetadata(
				["/about", "/blog"],
				baseUrl,
				lastmod,
				undefined,
				undefined,
				undefined,
			);
			expect(entries).toEqual([
				{ loc: "https://example.com/about", lastmod: "2025-01-01" },
				{ loc: "https://example.com/blog" },
			]);
		});

		test("passes the URL path (not full loc) to the callback", async () => {
			let receivedUrl = "";
			const lastmod = (url: string) => {
				receivedUrl = url;
				return undefined;
			};
			await resolveMetadata(
				["/about"],
				baseUrl,
				lastmod,
				undefined,
				undefined,
				undefined,
			);
			expect(receivedUrl).toBe("/about");
		});
	});

	describe("priority", () => {
		test("applies uniform priority number to all entries", async () => {
			const entries = await resolveMetadata(
				["/a", "/b"],
				baseUrl,
				undefined,
				0.5,
				undefined,
				undefined,
			);
			expect(entries).toEqual([
				{ loc: "https://example.com/a", priority: 0.5 },
				{ loc: "https://example.com/b", priority: 0.5 },
			]);
		});

		test("applies priority rules with exact string match", async () => {
			const rules = [{ match: "/about", priority: 0.8 }];
			const entries = await resolveMetadata(
				["/about", "/blog"],
				baseUrl,
				undefined,
				rules,
				undefined,
				undefined,
			);
			expect(entries).toEqual([
				{ loc: "https://example.com/about", priority: 0.8 },
				{ loc: "https://example.com/blog" },
			]);
		});

		test("applies priority rules with regex match", async () => {
			const rules = [{ match: /^\/blog/, priority: 0.7 }];
			const entries = await resolveMetadata(
				["/about", "/blog", "/blog/post"],
				baseUrl,
				undefined,
				rules,
				undefined,
				undefined,
			);
			expect(entries).toEqual([
				{ loc: "https://example.com/about" },
				{ loc: "https://example.com/blog", priority: 0.7 },
				{ loc: "https://example.com/blog/post", priority: 0.7 },
			]);
		});

		test("first matching rule wins", async () => {
			const rules = [
				{ match: "/", priority: 1.0 },
				{ match: /.*/, priority: 0.5 },
			];
			const entries = await resolveMetadata(
				["/", "/about"],
				baseUrl,
				undefined,
				rules,
				undefined,
				undefined,
			);
			expect(entries).toEqual([
				{ loc: "https://example.com/", priority: 1.0 },
				{ loc: "https://example.com/about", priority: 0.5 },
			]);
		});

		test("omits priority when no rules match", async () => {
			const rules = [{ match: "/nonexistent", priority: 1.0 }];
			const entries = await resolveMetadata(
				["/about"],
				baseUrl,
				undefined,
				rules,
				undefined,
				undefined,
			);
			expect(entries).toEqual([{ loc: "https://example.com/about" }]);
		});

		test("applies priority function based on child count", async () => {
			const allUrls = ["/", "/blog", "/blog/post-1", "/blog/post-2", "/about"];
			const priorityFn = (url: string, { urls }: { urls: string[] }) => {
				const children = urls.filter(
					(u) => u !== url && u.startsWith(`${url === "/" ? "" : url}/`),
				);
				if (children.length > 0) return 0.8;
				return 0.5;
			};
			const entries = await resolveMetadata(
				allUrls,
				baseUrl,
				undefined,
				priorityFn,
				undefined,
				undefined,
			);
			expect(entries).toEqual([
				{ loc: "https://example.com/", priority: 0.8 },
				{ loc: "https://example.com/blog", priority: 0.8 },
				{ loc: "https://example.com/blog/post-1", priority: 0.5 },
				{ loc: "https://example.com/blog/post-2", priority: 0.5 },
				{ loc: "https://example.com/about", priority: 0.5 },
			]);
		});

		test("priority function receives correct context", async () => {
			const allUrls = ["/a", "/b", "/c"];
			let receivedContext: { urls: string[] } | undefined;
			const priorityFn = (
				_url: string,
				context: { urls: string[] },
			) => {
				receivedContext = context;
				return 0.5;
			};
			await resolveMetadata(
				allUrls,
				baseUrl,
				undefined,
				priorityFn,
				undefined,
				undefined,
			);
			expect(receivedContext?.urls).toEqual(allUrls);
		});

		test("priority function returning undefined omits priority", async () => {
			const priorityFn = (url: string) => {
				if (url === "/about") return 0.9;
				return undefined;
			};
			const entries = await resolveMetadata(
				["/about", "/blog"],
				baseUrl,
				undefined,
				priorityFn,
				undefined,
				undefined,
			);
			expect(entries).toEqual([
				{ loc: "https://example.com/about", priority: 0.9 },
				{ loc: "https://example.com/blog" },
			]);
		});
	});

	test("combines lastmod and priority", async () => {
		const entries = await resolveMetadata(
			["/about"],
			baseUrl,
			() => "2025-06-15",
			0.8,
			undefined,
			undefined,
		);
		expect(entries).toEqual([
			{
				loc: "https://example.com/about",
				lastmod: "2025-06-15",
				priority: 0.8,
			},
		]);
	});

	describe("changefreq", () => {
		test("applies uniform changefreq string to all entries", async () => {
			const entries = await resolveMetadata(
				["/a", "/b"],
				baseUrl,
				undefined,
				undefined,
				"weekly",
				undefined,
			);
			expect(entries).toEqual([
				{ loc: "https://example.com/a", changefreq: "weekly" },
				{ loc: "https://example.com/b", changefreq: "weekly" },
			]);
		});

		test("applies changefreq rules with exact string match", async () => {
			const rules = [{ match: "/about", changefreq: "monthly" as const }];
			const entries = await resolveMetadata(
				["/about", "/blog"],
				baseUrl,
				undefined,
				undefined,
				rules,
				undefined,
			);
			expect(entries).toEqual([
				{ loc: "https://example.com/about", changefreq: "monthly" },
				{ loc: "https://example.com/blog" },
			]);
		});

		test("applies changefreq rules with regex match", async () => {
			const rules = [{ match: /^\/blog/, changefreq: "daily" as const }];
			const entries = await resolveMetadata(
				["/about", "/blog", "/blog/post"],
				baseUrl,
				undefined,
				undefined,
				rules,
				undefined,
			);
			expect(entries).toEqual([
				{ loc: "https://example.com/about" },
				{ loc: "https://example.com/blog", changefreq: "daily" },
				{ loc: "https://example.com/blog/post", changefreq: "daily" },
			]);
		});

		test("first matching rule wins", async () => {
			const rules = [
				{ match: "/", changefreq: "always" as const },
				{ match: /.*/, changefreq: "yearly" as const },
			];
			const entries = await resolveMetadata(
				["/", "/about"],
				baseUrl,
				undefined,
				undefined,
				rules,
				undefined,
			);
			expect(entries).toEqual([
				{ loc: "https://example.com/", changefreq: "always" },
				{ loc: "https://example.com/about", changefreq: "yearly" },
			]);
		});

		test("omits changefreq when no rules match", async () => {
			const rules = [{ match: "/nonexistent", changefreq: "daily" as const }];
			const entries = await resolveMetadata(
				["/about"],
				baseUrl,
				undefined,
				undefined,
				rules,
				undefined,
			);
			expect(entries).toEqual([{ loc: "https://example.com/about" }]);
		});
	});

	test("combines lastmod, priority, and changefreq", async () => {
		const entries = await resolveMetadata(
			["/about"],
			baseUrl,
			() => "2025-06-15",
			0.8,
			"weekly",
			undefined,
		);
		expect(entries).toEqual([
			{
				loc: "https://example.com/about",
				lastmod: "2025-06-15",
				priority: 0.8,
				changefreq: "weekly",
			},
		]);
	});

	describe("images", () => {
		test("includes images when callback returns values", async () => {
			const images = () => [{ loc: "https://example.com/photo.jpg" }];
			const entries = await resolveMetadata(
				["/about"],
				baseUrl,
				undefined,
				undefined,
				undefined,
				images,
			);
			expect(entries).toEqual([
				{
					loc: "https://example.com/about",
					images: [{ loc: "https://example.com/photo.jpg" }],
				},
			]);
		});

		test("omits images when callback returns undefined", async () => {
			const images = () => undefined;
			const entries = await resolveMetadata(
				["/about"],
				baseUrl,
				undefined,
				undefined,
				undefined,
				images,
			);
			expect(entries).toEqual([{ loc: "https://example.com/about" }]);
		});

		test("omits images when callback returns empty array", async () => {
			const images = () => [];
			const entries = await resolveMetadata(
				["/about"],
				baseUrl,
				undefined,
				undefined,
				undefined,
				images,
			);
			expect(entries).toEqual([{ loc: "https://example.com/about" }]);
		});

		test("supports async images callback", async () => {
			const images = async (url: string) => {
				if (url === "/about") return [{ loc: "https://example.com/about.jpg" }];
				return undefined;
			};
			const entries = await resolveMetadata(
				["/about", "/blog"],
				baseUrl,
				undefined,
				undefined,
				undefined,
				images,
			);
			expect(entries).toEqual([
				{
					loc: "https://example.com/about",
					images: [{ loc: "https://example.com/about.jpg" }],
				},
				{ loc: "https://example.com/blog" },
			]);
		});

		test("supports multiple images per URL", async () => {
			const images = () => [
				{ loc: "https://example.com/a.jpg" },
				{ loc: "https://example.com/b.jpg" },
			];
			const entries = await resolveMetadata(
				["/about"],
				baseUrl,
				undefined,
				undefined,
				undefined,
				images,
			);
			expect(entries).toEqual([
				{
					loc: "https://example.com/about",
					images: [
						{ loc: "https://example.com/a.jpg" },
						{ loc: "https://example.com/b.jpg" },
					],
				},
			]);
		});

		test("passes the URL path to the callback", async () => {
			let receivedUrl = "";
			const images = (url: string) => {
				receivedUrl = url;
				return undefined;
			};
			await resolveMetadata(
				["/about"],
				baseUrl,
				undefined,
				undefined,
				undefined,
				images,
			);
			expect(receivedUrl).toBe("/about");
		});
	});
});
