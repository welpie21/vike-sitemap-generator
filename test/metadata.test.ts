import { describe, expect, test } from "bun:test";
import { resolveMetadata } from "../src/metadata.ts";
import type { CollectedUrl } from "../src/types.ts";

function toCollected(urls: string[]): CollectedUrl[] {
	return urls.map((url) => ({ url }));
}

describe("resolveMetadata", () => {
	const baseUrl = "https://example.com";
	const defaultConcurrency = 10;

	test("creates entries with full loc URLs", async () => {
		const entries = await resolveMetadata(
			toCollected(["/about", "/blog"]),
			baseUrl,
			undefined,
			undefined,
			undefined,
			undefined,
			defaultConcurrency,
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
				toCollected(["/about"]),
				baseUrl,
				lastmod,
				undefined,
				undefined,
				undefined,
				defaultConcurrency,
			);
			expect(entries).toEqual([
				{ loc: "https://example.com/about", lastmod: "2025-06-15" },
			]);
		});

		test("omits lastmod when callback returns undefined", async () => {
			const lastmod = () => undefined;
			const entries = await resolveMetadata(
				toCollected(["/about"]),
				baseUrl,
				lastmod,
				undefined,
				undefined,
				undefined,
				defaultConcurrency,
			);
			expect(entries).toEqual([{ loc: "https://example.com/about" }]);
		});

		test("supports async lastmod callback", async () => {
			const lastmod = async (url: string) => {
				if (url === "/about") return "2025-01-01";
				return undefined;
			};
			const entries = await resolveMetadata(
				toCollected(["/about", "/blog"]),
				baseUrl,
				lastmod,
				undefined,
				undefined,
				undefined,
				defaultConcurrency,
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
				toCollected(["/about"]),
				baseUrl,
				lastmod,
				undefined,
				undefined,
				undefined,
				defaultConcurrency,
			);
			expect(receivedUrl).toBe("/about");
		});
	});

	describe("priority", () => {
		test("applies uniform priority number to all entries", async () => {
			const entries = await resolveMetadata(
				toCollected(["/a", "/b"]),
				baseUrl,
				undefined,
				0.5,
				undefined,
				undefined,
				defaultConcurrency,
			);
			expect(entries).toEqual([
				{ loc: "https://example.com/a", priority: 0.5 },
				{ loc: "https://example.com/b", priority: 0.5 },
			]);
		});

		test("applies priority rules with exact string match", async () => {
			const rules = [{ match: "/about", priority: 0.8 }];
			const entries = await resolveMetadata(
				toCollected(["/about", "/blog"]),
				baseUrl,
				undefined,
				rules,
				undefined,
				undefined,
				defaultConcurrency,
			);
			expect(entries).toEqual([
				{ loc: "https://example.com/about", priority: 0.8 },
				{ loc: "https://example.com/blog" },
			]);
		});

		test("applies priority rules with regex match", async () => {
			const rules = [{ match: /^\/blog/, priority: 0.7 }];
			const entries = await resolveMetadata(
				toCollected(["/about", "/blog", "/blog/post"]),
				baseUrl,
				undefined,
				rules,
				undefined,
				undefined,
				defaultConcurrency,
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
				toCollected(["/", "/about"]),
				baseUrl,
				undefined,
				rules,
				undefined,
				undefined,
				defaultConcurrency,
			);
			expect(entries).toEqual([
				{ loc: "https://example.com/", priority: 1.0 },
				{ loc: "https://example.com/about", priority: 0.5 },
			]);
		});

		test("omits priority when no rules match", async () => {
			const rules = [{ match: "/nonexistent", priority: 1.0 }];
			const entries = await resolveMetadata(
				toCollected(["/about"]),
				baseUrl,
				undefined,
				rules,
				undefined,
				undefined,
				defaultConcurrency,
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
				toCollected(allUrls),
				baseUrl,
				undefined,
				priorityFn,
				undefined,
				undefined,
				defaultConcurrency,
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
			const priorityFn = (_url: string, context: { urls: string[] }) => {
				receivedContext = context;
				return 0.5;
			};
			await resolveMetadata(
				toCollected(allUrls),
				baseUrl,
				undefined,
				priorityFn,
				undefined,
				undefined,
				defaultConcurrency,
			);
			expect(receivedContext?.urls).toEqual(allUrls);
		});

		test("priority function returning undefined omits priority", async () => {
			const priorityFn = (url: string) => {
				if (url === "/about") return 0.9;
				return undefined;
			};
			const entries = await resolveMetadata(
				toCollected(["/about", "/blog"]),
				baseUrl,
				undefined,
				priorityFn,
				undefined,
				undefined,
				defaultConcurrency,
			);
			expect(entries).toEqual([
				{ loc: "https://example.com/about", priority: 0.9 },
				{ loc: "https://example.com/blog" },
			]);
		});
	});

	test("combines lastmod and priority", async () => {
		const entries = await resolveMetadata(
			toCollected(["/about"]),
			baseUrl,
			() => "2025-06-15",
			0.8,
			undefined,
			undefined,
			defaultConcurrency,
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
				toCollected(["/a", "/b"]),
				baseUrl,
				undefined,
				undefined,
				"weekly",
				undefined,
				defaultConcurrency,
			);
			expect(entries).toEqual([
				{ loc: "https://example.com/a", changefreq: "weekly" },
				{ loc: "https://example.com/b", changefreq: "weekly" },
			]);
		});

		test("applies changefreq rules with exact string match", async () => {
			const rules = [{ match: "/about", changefreq: "monthly" as const }];
			const entries = await resolveMetadata(
				toCollected(["/about", "/blog"]),
				baseUrl,
				undefined,
				undefined,
				rules,
				undefined,
				defaultConcurrency,
			);
			expect(entries).toEqual([
				{ loc: "https://example.com/about", changefreq: "monthly" },
				{ loc: "https://example.com/blog" },
			]);
		});

		test("applies changefreq rules with regex match", async () => {
			const rules = [{ match: /^\/blog/, changefreq: "daily" as const }];
			const entries = await resolveMetadata(
				toCollected(["/about", "/blog", "/blog/post"]),
				baseUrl,
				undefined,
				undefined,
				rules,
				undefined,
				defaultConcurrency,
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
				toCollected(["/", "/about"]),
				baseUrl,
				undefined,
				undefined,
				rules,
				undefined,
				defaultConcurrency,
			);
			expect(entries).toEqual([
				{ loc: "https://example.com/", changefreq: "always" },
				{ loc: "https://example.com/about", changefreq: "yearly" },
			]);
		});

		test("omits changefreq when no rules match", async () => {
			const rules = [{ match: "/nonexistent", changefreq: "daily" as const }];
			const entries = await resolveMetadata(
				toCollected(["/about"]),
				baseUrl,
				undefined,
				undefined,
				rules,
				undefined,
				defaultConcurrency,
			);
			expect(entries).toEqual([{ loc: "https://example.com/about" }]);
		});
	});

	test("combines lastmod, priority, and changefreq", async () => {
		const entries = await resolveMetadata(
			toCollected(["/about"]),
			baseUrl,
			() => "2025-06-15",
			0.8,
			"weekly",
			undefined,
			defaultConcurrency,
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
				toCollected(["/about"]),
				baseUrl,
				undefined,
				undefined,
				undefined,
				images,
				defaultConcurrency,
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
				toCollected(["/about"]),
				baseUrl,
				undefined,
				undefined,
				undefined,
				images,
				defaultConcurrency,
			);
			expect(entries).toEqual([{ loc: "https://example.com/about" }]);
		});

		test("omits images when callback returns empty array", async () => {
			const images = () => [];
			const entries = await resolveMetadata(
				toCollected(["/about"]),
				baseUrl,
				undefined,
				undefined,
				undefined,
				images,
				defaultConcurrency,
			);
			expect(entries).toEqual([{ loc: "https://example.com/about" }]);
		});

		test("supports async images callback", async () => {
			const images = async (url: string) => {
				if (url === "/about") return [{ loc: "https://example.com/about.jpg" }];
				return undefined;
			};
			const entries = await resolveMetadata(
				toCollected(["/about", "/blog"]),
				baseUrl,
				undefined,
				undefined,
				undefined,
				images,
				defaultConcurrency,
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
				toCollected(["/about"]),
				baseUrl,
				undefined,
				undefined,
				undefined,
				images,
				defaultConcurrency,
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
				toCollected(["/about"]),
				baseUrl,
				undefined,
				undefined,
				undefined,
				images,
				defaultConcurrency,
			);
			expect(receivedUrl).toBe("/about");
		});
	});

	describe("per-page config", () => {
		test("per-page priority overrides global priority", async () => {
			const items: CollectedUrl[] = [
				{ url: "/about", pageConfig: { priority: 0.9 } },
				{ url: "/blog" },
			];
			const entries = await resolveMetadata(
				items,
				baseUrl,
				undefined,
				0.5,
				undefined,
				undefined,
				defaultConcurrency,
			);
			expect(entries[0]?.priority).toBe(0.9);
			expect(entries[1]?.priority).toBe(0.5);
		});

		test("per-page changefreq overrides global changefreq", async () => {
			const items: CollectedUrl[] = [
				{ url: "/about", pageConfig: { changefreq: "daily" } },
				{ url: "/blog" },
			];
			const entries = await resolveMetadata(
				items,
				baseUrl,
				undefined,
				undefined,
				"weekly",
				undefined,
				defaultConcurrency,
			);
			expect(entries[0]?.changefreq).toBe("daily");
			expect(entries[1]?.changefreq).toBe("weekly");
		});

		test("per-page lastmod overrides global lastmod callback", async () => {
			const items: CollectedUrl[] = [
				{ url: "/about", pageConfig: { lastmod: "2024-01-01" } },
				{ url: "/blog" },
			];
			const entries = await resolveMetadata(
				items,
				baseUrl,
				() => "2025-06-15",
				undefined,
				undefined,
				undefined,
				defaultConcurrency,
			);
			expect(entries[0]?.lastmod).toBe("2024-01-01");
			expect(entries[1]?.lastmod).toBe("2025-06-15");
		});

		test("per-page images overrides global images callback", async () => {
			const pageImages = [{ loc: "https://example.com/page-img.jpg" }];
			const items: CollectedUrl[] = [
				{ url: "/about", pageConfig: { images: pageImages } },
				{ url: "/blog" },
			];
			const entries = await resolveMetadata(
				items,
				baseUrl,
				undefined,
				undefined,
				undefined,
				() => [{ loc: "https://example.com/global.jpg" }],
				defaultConcurrency,
			);
			expect(entries[0]?.images).toEqual(pageImages);
			expect(entries[1]?.images).toEqual([
				{ loc: "https://example.com/global.jpg" },
			]);
		});

		test("per-page exclude removes the URL from results", async () => {
			const items: CollectedUrl[] = [
				{ url: "/about", pageConfig: { exclude: true } },
				{ url: "/blog" },
			];
			const entries = await resolveMetadata(
				items,
				baseUrl,
				undefined,
				undefined,
				undefined,
				undefined,
				defaultConcurrency,
			);
			expect(entries).toEqual([{ loc: "https://example.com/blog" }]);
		});
	});

	describe("concurrency", () => {
		test("resolves all URLs with concurrency of 1", async () => {
			const entries = await resolveMetadata(
				toCollected(["/a", "/b", "/c"]),
				baseUrl,
				undefined,
				undefined,
				undefined,
				undefined,
				1,
			);
			expect(entries).toHaveLength(3);
		});

		test("resolves all URLs with concurrency of Infinity", async () => {
			const entries = await resolveMetadata(
				toCollected(["/a", "/b", "/c"]),
				baseUrl,
				undefined,
				undefined,
				undefined,
				undefined,
				Number.POSITIVE_INFINITY,
			);
			expect(entries).toHaveLength(3);
		});

		test("runs async callbacks concurrently within batch", async () => {
			const callOrder: string[] = [];
			const lastmod = async (url: string) => {
				callOrder.push(`start:${url}`);
				await new Promise((r) => setTimeout(r, 10));
				callOrder.push(`end:${url}`);
				return "2025-01-01";
			};
			await resolveMetadata(
				toCollected(["/a", "/b"]),
				baseUrl,
				lastmod,
				undefined,
				undefined,
				undefined,
				2,
			);
			expect(callOrder[0]).toBe("start:/a");
			expect(callOrder[1]).toBe("start:/b");
		});
	});
});
